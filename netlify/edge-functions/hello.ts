const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN")
const TELEGRAM_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`
const methodUrl = (name: String) => `${TELEGRAM_URL}/${name}`

const call = (method: string) => (body: FormData) => fetch(
  methodUrl(method), {
    method: "POST",
    body: body,
  }
)

const sendMessage = call("sendMessage")

const sendMessageArg = (chatID: Number, text: string) => {
  const fd = new FormData()
  fd.set("chat_id", chatID.toString())
  fd.set("text", text)
  return fd
}

const generateCtx = (chatID: Number, url: URL) => {
  return `https://${url.host}/watch?ctx=${chatID}`
}

const pre = (text: string) => `\`${text}\``

export default async (req: Request) => {
  const data = await req.json()
  
  const chatID = data.message.chat.id
  const ctx = generateCtx(chatID, new URL(req.url))
  const message = sendMessageArg(chatID, `Hook: ${pre(ctx)}`)
  message.set("parse_mode", "MarkdownV2")
  
  sendMessage(message)
  
  return new Response("mau")
}
