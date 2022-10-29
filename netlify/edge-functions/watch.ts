import { pre, sendMessage, sendMessageArg } from "./commons.ts"

export default async (req: Request) => {
  const data = await req.json()
  const chatID = (new URL(req.url)).searchParams.get("ctx")
  const {
    hook: { events },
    repository: { full_name },
    sender: { login },
  } = data
  
  const message = sendMessageArg(Number(chatID), `repo: ${pre(full_name)}
events: ${events.join(", ")}
sender: @${login}`)
  message.set("parse_mode", "MarkdownV2")
  
  sendMessage(message)
  return new Response("")
}
