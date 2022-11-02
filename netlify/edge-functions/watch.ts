import { pre, sendMessage, sendMessageArg } from "./ts/commons.ts"
import eventToString from "./ts/events.ts"

export default async (req: Request) => {
  const data = await req.json()
  const chatID = (new URL(req.url)).searchParams.get("ctx")
  
  const response = eventToString(
    req.headers.get("X-GitHub-Event"), data
  )
  
  const message = sendMessageArg(Number(chatID), response)
  message.set("parse_mode", "MarkdownV2")
  message.set("disable_web_page_preview", true)
  
  console.log(message.get("text"))
  
  const res = await sendMessage(message)
  if (res.status !== 200) {
    console.debug(await res.json())
  }
  return new Response("")
}
