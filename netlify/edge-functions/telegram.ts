import { Bot, webhookCallback } from "https://deno.land/x/grammy/mod.ts"
import { TELEGRAM_TOKEN } from './ts/commons.ts'
import { oauthSessions } from "./ts/oauth.ts"

if (typeof TELEGRAM_TOKEN === "undefined") {
  throw new Error("telegram token not found")
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
