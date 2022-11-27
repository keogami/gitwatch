import { oauthMenu } from "./menus/oauth.ts"
import {
  Bot,
  webhookCallback,
} from "https://deno.land/x/grammy@v1.12.0/mod.ts"
import { tokenStore } from "./github.ts"
import { gitwatchMenu } from "./menus/gitwatch.ts"

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN")

if (typeof TELEGRAM_TOKEN === "undefined") {
  throw new Error("telegram token not found")
}

const bot = new Bot(TELEGRAM_TOKEN)
export default bot
export const callback = webhookCallback(bot, "std/http")

bot.use(oauthMenu)
bot.use(gitwatchMenu)

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
    reply_markup: gitwatchMenu,
  })
})

bot.command("start", (ctx) => ctx.reply("Welcome to gitwatch"))
bot.command("ping", (ctx) => ctx.reply("Pong!"))

await bot.api.setMyCommands([
  // { command: "ping", description: "Ping the bot" }, // disabled because it clashes with ping commands of other bots
  { command: "start", description: "Start the bot" },
  { command: "gitwatch", description: "Watch a github repo or organization" },
])
