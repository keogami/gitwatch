import { Menu } from "https://deno.land/x/grammy_menu@v1.1.2/menu.ts"
import { generateOauthURL } from "../github.ts"
import { generateContext, oauthSessions } from "../oauth.ts"

export const oauthMenu = new Menu("oauth") 

oauthMenu.dynamic(async (ctx, range) => {
  const uid = ctx.msg?.from?.id?.toString()
  const cid = ctx.chat?.id.toString()

  if (typeof uid === "undefined") {
    ctx.reply("Couldn't find the user.")
    return
  }
  
  if (typeof cid === "undefined") {
    ctx.reply("Couldn't find the chat id.")
    return
  }
  
  const state = crypto.randomUUID()
  
  const oauthCtx = await generateContext(uid)

  const res = await oauthSessions.set(oauthCtx, { cid, uid, state })
  if (!res) {
    throw new Error("Couldn't set the context in the db")
  }
  
  const authUrl = generateOauthURL(oauthCtx, state)

  range.url("Login to GitHub", authUrl.toString())
})
