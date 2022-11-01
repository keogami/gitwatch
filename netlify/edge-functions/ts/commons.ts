import devvar, { DevelopmentVar } from "./development.ts"

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN")
const TELEGRAM_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`

const methodUrl = (name: String) => `${TELEGRAM_URL}/${name}`
export const call = (method: string) => (body: FormData) => fetch(
  methodUrl(method), {
    method: "POST",
    body: body,
  }
)

export const sendMessage = call("sendMessage")

export const sendMessageArg = (chatID: Number, text: string) => {
  const fd = new FormData()
  fd.set("chat_id", chatID.toString())
  fd.set("text", text)
  return fd
}

export const generateCtx = (chatID: Number, url: URL) => {
  return `https://${ devvar.get(DevelopmentVar.Hostname) ?? url.host }/watch?ctx=${chatID}`
}

export const pre = (text: string) => `\`${text}\``
