import { oauthMenu } from "./menus/oauth.ts"
import { generateContext, oauthSessions } from "./oauth.ts"
import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.12.0/mod.ts"

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN");

if (typeof TELEGRAM_TOKEN === "undefined") {
  throw new Error("telegram token not found")
}

const bot = new Bot(TELEGRAM_TOKEN)
export default bot
export const callback = webhookCallback(bot, "std/http")

bot.use(oauthMenu)

bot.command("gitwatch", async ctx => {
  const uid = ctx.msg.from?.id?.toString()
  
  if (typeof uid === "undefined") {
    ctx.reply("/gitwatch should only be invoked by users.")
    return
  }

  const oauthCtx = await generateContext(uid)
  if (await oauthSessions.has(oauthCtx)) {
    const data = await oauthSessions.get(oauthCtx)
    ctx.reply(`${data?.cid} found`)
    ctx.reply("Please authenticate with the previous menu")
    return
  }
  

  await ctx.reply(`Please log into your account to choose your repository.`, {
    parse_mode: "HTML",
    reply_markup: oauthMenu,
  })
})

bot.command("start", ctx => ctx.reply("Welcome to gitwatch"))
bot.command("ping", ctx => ctx.reply("Pong!"))

await bot.api.setMyCommands([
  // { command: "ping", description: "Ping the bot" }, // disabled because it clashes with ping commands of other bots
  { command: "start", description: "Start the bot" },
  { command: "gitwatch", description: "Watch a github repo or organization" },
])


