import { Menu } from "https://deno.land/x/grammy_menu@v1.1.2/menu.ts"
import {
  isNone,
  None,
  Option,
  Some,
} from "https://deno.land/x/monads@v0.5.10/mod.ts"
import { Context } from "https://deno.land/x/grammy@v1.12.0/context.ts"
import { setupWebhook, tokenStore } from "../github.ts"
import { Octokit } from "https://cdn.skypack.dev/-/@octokit/core@v4.0.5-DCTGyLHthf6deTvrXINL/dist=es2019,mode=imports/optimized/@octokit/core.js"

interface Repo {
  name: string
  owner: string
}

interface RepoList {
  repos: Repo[]
  hasPrev: boolean
  hasNext: boolean
}

const getOrgCount = async (client: Octokit): Promise<number> => {
  const {
    viewer: { organizations: { totalCount } },
  } = await client.graphql(`
      query {
        viewer {
          organizations(first:1) {
            totalCount
          }
        }
      }
    `)
  return totalCount
}

const getOrgList = async (
  client: Octokit,
  count: number,
): Promise<string[]> => {
  const {
    viewer: {
      login,
      organizations: { nodes },
    },
  } = await client.graphql(
    `
      query ($count:Int) { 
        viewer { 
          login
          organizations(first:$count) {
            nodes { login }
          }
        }
      }
    `,
    { count },
  )

  return [
    login,
    ...nodes.map((it: { login: string }) => it.login),
  ]
}

const getAllOrgs = async (client: Octokit) => {
  const count = await getOrgCount(client)
  return await getOrgList(client, count)
}

const createClientFor = async (
  uid: string,
): Promise<Option<Octokit>> => {
  const token = await tokenStore.get(uid.toString())
  if (token === null) return None

  const client = new Octokit({
    userAgent: "gitwatch",
    auth: token,
  })

  return Some(client)
}

const REPO_PER_PAGE = 5

const getRepoList = async (
  ctx: Context,
  page: number,
): Promise<RepoList | null> => {
  const id = ctx.from?.id
  if (typeof id === "undefined") return null

  const token = await tokenStore.get(id.toString())
  if (token === null) return null

  const client = new Octokit({
    userAgent: "gitwatch",
    auth: token,
  })

  const resp = await client.graphql(
    `query ($first:Int!) { 
      viewer {
        repositories(first:$first, orderBy:{
          field:UPDATED_AT, direction:DESC
        }) {
          pageInfo {
            hasNextPage
          }
          nodes {
            nameWithOwner
          }
        }
      }
    }`,
    {
      first: page * REPO_PER_PAGE,
    },
  )

  const { viewer: { repositories: { nodes, pageInfo: hasNextPage } } } = resp

  const pageInfo = {
    hasPrev: page > 1,
    hasNext: hasNextPage,
  }

  const last = ((l) => l === 0 ? 5 : l)(nodes.length % REPO_PER_PAGE)

  const repos: Repo[] = (nodes as { nameWithOwner: string }[]).slice(-last)
    .map((it) => it.nameWithOwner.split("/")).map(([owner, name]) => ({
      owner,
      name,
    }))

  return { ...pageInfo, repos }
}

interface MenuPayload {
  name: string
  owner: string
  page: number
  load: boolean
}

const parseMenuPayload = (payload: string): MenuPayload => {
  const [owner, name, page, load] = payload.split(":")
  return { owner, name, page: Number(page), load: Number(load) === 1 }
}

const packPayload = (payload: MenuPayload): string =>
  [payload.owner, payload.name, payload.page, payload.load ? 1 : 0].join(":")

const padWith = <T>(arr: T[], length: number, fill: T): T[] => {
  if (arr.length >= length) return arr

  const rem = length - arr.length
  const remArr: T[] = []
  remArr.length = rem
  return [...arr, ...remArr.fill(fill)]
}

export const gitwatchMenu = new Menu("gitwatch")
  .submenu("Organization", "org")
  .submenu("Repository", "repo")

interface OrgPayload {
  org: string
}
const packOrgPayload = (p: OrgPayload): string => p.org
const parseOrgPayload = (str: string): OrgPayload => {
  return { org: str }
}

const orgMenuFactory = (to: string) =>
  new Menu("org").dynamic(async (ctx, range) => {
    const uid = ctx.from?.id
    if (typeof uid === "undefined") {
      range.text("None").back("back")
      return
    }

    const client = await createClientFor(uid.toString())
    if (isNone(client)) {
      range.submenu("Login", "oauth")
      return
    }

    const orgs = await getAllOrgs(client.unwrap())

    orgs.forEach((it) => {
      range.submenu({
        text: it,
        payload: packOrgPayload({ org: it }),
      }, to).row()
    })
  }).back("back")

const orgMenu = orgMenuFactory("org-confirm")
const orgConfirmMenu = new Menu("org-confirm").dynamic((ctx, range) => {
  range
    .back({
      text: "No",
      payload: ctx.match as string,
    })
    .text({
      text: "Yes",
      payload: ctx.match as string,
    }, (ctx) => {
      ctx.reply(ctx.match?.toString() ?? "dunno")
    })
})

const confirmMenu = new Menu("repo-confirm").dynamic((ctx, range) => {
  range
    .text({
      text: "No",
      payload: ctx.match as string,
    }, (ctx) => ctx.menu.back())
    .text({
      text: "Yes",
      payload: ctx.match as string,
    }, async (ctx) => {
      const { name, owner } = parseMenuPayload(ctx.match as string)
      ctx.answerCallbackQuery("Setting up the webhooks.")
      const result = await setupWebhook({
        uid: ctx.from.id.toString(),
        cid: ctx.chat?.id?.toString() ?? "unknown", //FIXME: might be null
        name,
        owner,
      })

      result.match({
        ok: () => {
          ctx.menu.close()
          ctx.reply("/gitwatch is watching your repo.")
        },
        err: (e) => {
          ctx.menu.back()
          ctx.reply(e.message)
        },
      })
    })
})

const repoMenu = new Menu("repo").dynamic(async (ctx, range) => {
  const _payload = ctx.match?.toString()
  const payload = Some(_payload === "" ? undefined : _payload).map(
    parseMenuPayload,
  ).unwrapOr({
    owner: "default",
    name: "default",
    page: 1,
    load: true,
  })

  const repoList = await getRepoList(ctx, payload.page)
  if (repoList === null) {
    ctx.reply("Couldn't fetch your repository list.")
    return
  }

  const names: [string, MenuPayload][] = padWith(
    repoList.repos.map((
      { name, owner },
    ) => [`${owner}/${name}`, { ...payload, name, owner }]),
    REPO_PER_PAGE,
    ["-", {
      ...payload,
      name: "nop",
    }],
  )

  names.map(([name, payload]) =>
    range.text(
      { text: name, payload: packPayload(payload) },
      async (ctx) => {
        const { name, owner } = parseMenuPayload(ctx.match as string)
        await ctx.editMessageText(`/gitwatch events in ${owner}/${name}?`, {
          reply_markup: confirmMenu,
        })
      },
    ).row()
  )

  const prevPayload = repoList.hasPrev
    ? { ...payload, page: payload.page - 1, load: true }
    : { ...payload, load: false }

  const nextPayload = repoList.hasNext
    ? { ...payload, page: payload.page + 1, load: true }
    : { ...payload, load: false }

  range.text(
    { text: "<", payload: packPayload(prevPayload) },
    (ctx) => {
      const payload = parseMenuPayload(ctx.match as string)
      payload.load
        ? ctx.menu.update()
        : ctx.answerCallbackQuery("This is the first page.")
    },
  )

  range.text(payload.page.toString(), () => {})

  range.text(
    { text: ">", payload: packPayload(nextPayload) },
    (ctx) => {
      const payload = parseMenuPayload(ctx.match as string)
      payload.load
        ? ctx.menu.update()
        : ctx.answerCallbackQuery("This is the last page.")
    },
  )
}).row()
  .back("back")

gitwatchMenu.register(repoMenu)
gitwatchMenu.register(orgMenu)
orgMenu.register(orgConfirmMenu)
repoMenu.register(confirmMenu)
