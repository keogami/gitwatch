import bot from "./ts/bot.ts"
import eventToString from "./ts/events.ts"
import { webhookContextStore } from "./ts/github.ts"

export default async (req: Request) => {
  const data = await req.json()
  const ctx = (new URL(req.url)).searchParams.get("ctx")
  
  const config = await webhookContextStore.get(ctx as string)
  if (config === null) {
    return
  }
  
  const chatID = config.cid
  
  const event = req.headers.get("X-GitHub-Event") as string
  
  const response = eventToString(event, data)
  
  await bot.api.sendMessage(chatID, response, {
    parse_mode: "HTML"
  })

  return new Response("")
}
