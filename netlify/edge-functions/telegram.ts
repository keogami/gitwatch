import { Bot, webhookCallback } from "https://deno.land/x/grammy/mod.ts"
import { getSiteHost, TELEGRAM_TOKEN } from "./ts/commons.ts"

if (typeof TELEGRAM_TOKEN === "undefined") {
  throw new Error("telegram token not found")
}

const bot = new Bot(TELEGRAM_TOKEN)

bot.command("gitwatch", ctx => {
  const id = ctx.chat.id
  const host = getSiteHost()
  
  ctx.reply(`Hook: <pre>https://${host}/watch?ctx=${id}</pre>`, {
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
