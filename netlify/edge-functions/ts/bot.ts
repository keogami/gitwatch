import { oauthMenu } from "./menus/oauth.ts"
import {
  Bot,
  Context,
  webhookCallback,
} from "https://deno.land/x/grammy@v1.12.0/mod.ts"
import { tokenStore } from "./github.ts"
import { Menu } from "https://deno.land/x/grammy_menu@v1.1.2/menu.ts"
import { Some } from "https://deno.land/x/monads@v0.5.10/mod.ts"
import { Octokit } from "https://cdn.skypack.dev/octokit"

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN")

if (typeof TELEGRAM_TOKEN === "undefined") {
  throw new Error("telegram token not found")
}

const bot = new Bot(TELEGRAM_TOKEN)
export default bot
export const callback = webhookCallback(bot, "std/http")

interface Repo {
  name: string
  owner: string
}

interface RepoList {
  repos: Repo[]
  hasPrev: boolean
  hasNext: boolean
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
      {name, owner},
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
      (ctx) => {
        ctx.reply(ctx.match ?? "dunno")
        ctx.menu.update()
      },
    ).row()
  )

  const prevPayload = repoList.hasPrev
    ? { ...payload, page: payload.page - 1, load: true }
    : { ...payload, page: payload.page, load: false }

  const nextPayload = repoList.hasNext
    ? { ...payload, page: payload.page + 1, load: true }
    : { ...payload, page: payload.page, load: false }

  range.text(
    { text: "<", payload: packPayload(prevPayload) },
    (ctx) => {
      const payload = parseMenuPayload(ctx.match as string)
      payload.load
        ? ctx.menu.update()
        : ctx.answerCallbackQuery("This is the first page.")
    },
  )

  range.text(
    { text: ">", payload: packPayload(nextPayload) },
    (ctx) => {
      const payload = parseMenuPayload(ctx.match as string)
      payload.load
        ? ctx.menu.update()
        : ctx.answerCallbackQuery("This is the last page.")
    },
  )
})

bot.use(oauthMenu)
bot.use(repoMenu)

bot.command("gitwatch", async (ctx) => {
  const uid = ctx.msg.from?.id?.toString()

  if (typeof uid === "undefined") {
    ctx.reply("/gitwatch should only be invoked by users.")
    return
  }

  if (!await tokenStore.has(uid)) {
    ctx.reply(`Please log into your account to choose your repository.`, {
      parse_mode: "HTML",
      reply_markup: oauthMenu,
    })
    return
  }

  ctx.reply("Please choose the repository or the organization to /gitwatch", {
    reply_markup: repoMenu,
  })
})

bot.command("start", (ctx) => ctx.reply("Welcome to gitwatch"))
bot.command("ping", (ctx) => ctx.reply("Pong!"))

await bot.api.setMyCommands([
  // { command: "ping", description: "Ping the bot" }, // disabled because it clashes with ping commands of other bots
  { command: "start", description: "Start the bot" },
  { command: "gitwatch", description: "Watch a github repo or organization" },
])
