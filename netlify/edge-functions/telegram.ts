import { Bot, webhookCallback } from "https://deno.land/x/grammy/mod.ts"
import { toHashString } from "https://deno.land/std/crypto/mod.ts" 
import { getSiteHost, TELEGRAM_TOKEN } from "./ts/commons.ts"
import redis, { scoped } from "./ts/redis.ts"

if (typeof TELEGRAM_TOKEN === "undefined") {
  throw new Error("telegram token not found")
}

const oauthSessionCtxMapKey = scoped("oauth")

interface OauthData {
  uid: string, // id of the user
  cid: string, // id of the chat
}

const oauthSessions = {
  async generateContext(uid: string): Promise<string> {
    const data = new TextEncoder().encode(uid)
    return toHashString(await crypto.subtle.digest("sha-1", data), "hex")
  },

  async has(uid: string): Promise<boolean> {
    const ctx = await this.generateContext(uid)
    const res = await redis.hexists(oauthSessionCtxMapKey, ctx)
    return res === 1
  },

  async create(data: OauthData): Promise<string> {
    const ctx = await this.generateContext(data.uid)
    const res = await redis.hset(oauthSessionCtxMapKey, ctx, JSON.stringify(data))

    if (res !== 1) {
      throw new Error("Redis: couldn't create oauth session")
    }

    return ctx
  },

  async retreive(ctx: string): Promise<OauthData | null> {
    const data = await redis.hget(oauthSessionCtxMapKey, ctx)

    if (data === null) return null
    return JSON.parse(data) as OauthData
  }
}

const bot = new Bot(TELEGRAM_TOKEN)

bot.command("gitwatch", async ctx => {
  const uid = ctx.msg.from?.id?.toString()
  const cid = ctx.chat.id.toString()

  if (typeof uid === "undefined") {
    ctx.reply("gitwatch should only be called by users")
    return
  }

  if (await oauthSessions.has(uid.toString())) {
    const data = await oauthSessions.retreive(await oauthSessions.generateContext(uid))
    ctx.reply(`${data?.cid} found`)
    ctx.reply("Please authenticate with the previous menu")
    return
  }
  
  const oauthCtx = await oauthSessions.create({ cid, uid })

  ctx.reply(`oauth: <pre>${oauthCtx}</pre>`, {
    parse_mode: "HTML"
  })
})

bot.command("start", ctx => ctx.reply("Welcome to gitwatch"))
bot.command("ping", ctx => ctx.reply("Pong!"))

await bot.api.setMyCommands([
  // { command: "ping", description: "Ping the bot" }, // disabled because it clashes with ping commands of other bots
  { command: "start", description: "Start the bot" },
  { command: "gitwatch", description: "Watch a github repo or organization" },
])

const callback = webhookCallback(bot, "std/http")

export default async (req: Request) => {
  return await callback(req)
}
