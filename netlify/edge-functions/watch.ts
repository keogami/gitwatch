import eventToString from "./ts/events.ts"
import { Bot } from "https://deno.land/x/grammy/mod.ts"
import { TELEGRAM_TOKEN } from "./ts/commons.ts"

const bot = new Bot(TELEGRAM_TOKEN as string)

export default async (req: Request) => {
  const data = await req.json()
  const chatID = (new URL(req.url)).searchParams.get("ctx")
  
  if (chatID === null) {
    throw new Error("ctx was not found attached to the hook")
  }
  
  const event = req.headers.get("X-GitHub-Event") as string
  
  const response = eventToString(event, data)
  
  await bot.api.sendMessage(chatID, response, {
    parse_mode: "HTML"
  })

  return new Response("")
}
