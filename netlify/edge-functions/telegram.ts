import { generateCtx, pre, sendMessage, sendMessageArg } from "./ts/commons.ts"

export default async (req: Request) => {
  const data = await req.json()
  if (data?.message?.entities?.[0]?.type === "bot_command") {
    // currently only handles /gitwatch so im not gonna bother creating a command MUXer
    const chatID = data.message.chat.id
    const ctx = generateCtx(chatID, new URL(req.url))
    const message = sendMessageArg(chatID, `Hook: ${pre(ctx)}`)
    message.set("parse_mode", "MarkdownV2")

    sendMessage(message)
  }

  return new Response("mau")
}
