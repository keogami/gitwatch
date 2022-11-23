import { oauthMenu } from "./menus/oauth.ts"
import {
  Bot,
  webhookCallback,
} from "https://deno.land/x/grammy@v1.12.0/mod.ts"
import { tokenStore } from "./github.ts"
import { Menu } from "https://deno.land/x/grammy_menu@v1.1.2/menu.ts"
import { Some } from "https://deno.land/x/monads@v0.5.10/mod.ts"

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN")

if (typeof TELEGRAM_TOKEN === "undefined") {
  throw new Error("telegram token not found")
}

const bot = new Bot(TELEGRAM_TOKEN)
export default bot
export const callback = webhookCallback(bot, "std/http")

interface RepoList {
  names: string[]
  hasPrev: boolean
  hasNext: boolean
}

const getRepoList = (page: number): RepoList => {
  switch (page) {
    case 1:
      return {
        names: ["blah", "blah2", "blah3"],
        hasPrev: false,
        hasNext: true,
      }
    case 2:
      return {
        names: ["blah4", "blah5", "blah6"],
        hasPrev: true,
        hasNext: true,
      }
    case 3:
      return {
        names: ["blah7", "blah8", "blah9"],
        hasPrev: true,
        hasNext: true,
      }
  }
  return { names: ["blah10", "blah11"], hasPrev: true, hasNext: false }
}

const REPO_PER_PAGE = 3

interface MenuPayload {
  name: string
  page: number
  load: boolean
}

const parseMenuPayload = (payload: string): MenuPayload => {
  const [name, page, load] = payload.split(":")
  return { name, page: Number(page), load: Number(load) === 1 }
}

const packPayload = (payload: MenuPayload): string =>
  `${payload.name}:${payload.page}:${payload.load ? 1 : 0}`

const padWith = <T>(arr: T[], length: number, fill: T): T[] => {
  if (arr.length >= length) return arr

  const rem = length - arr.length
  const remArr: T[] = []
  remArr.length = rem
  return [...arr, ...remArr.fill(fill)]
}

const repoMenu = new Menu("repo").dynamic((ctx, range) => {
  const _payload = ctx.match?.toString()
  const payload = Some(_payload === "" ? undefined : _payload).map(
    parseMenuPayload,
  ).unwrapOr({
    name: "default",
    page: 1,
    load: true,
  })

  const repoList = getRepoList(payload.page)
  const names: [string, MenuPayload][] = padWith(
    repoList.names.map((it) => [it, { ...payload, name: it }]),
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
