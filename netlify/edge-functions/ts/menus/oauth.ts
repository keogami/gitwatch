import { Menu } from "https://deno.land/x/grammy_menu@v1.1.2/menu.ts"
import { getSiteHost } from "../commons.ts"
import { oauthSessions } from "../oauth.ts"

const GitHubAuthURL = "https://github.com/login/oauth/authorize"
const GitHubClientID = Deno.env.get("GITHUB_CLIENT_ID")
const GitHubScopes = ["write:repo_hook", "admin:org_hook"].join(" ")
if (typeof GitHubClientID === "undefined") {
  throw new Error("Github client id was not found in the env")
}

const generateOauthURL = (ctx: string, state: string): URL => {
  const GitHubCallbackPath = `https://${getSiteHost()}/oauthCallback`
  const url = new URL(GitHubAuthURL)
  url.searchParams.set("client_id", GitHubClientID)
  url.searchParams.set("redirect_uri", GitHubCallbackPath)
  url.searchParams.set("scope", GitHubScopes)
  url.searchParams.set("state", `${ctx}:${state}`)

  return url
}

const oauthMenu = new Menu("oauth") 

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

  const oauthCtx = await oauthSessions.create({ cid, uid, state })
  
  const authUrl = generateOauthURL(oauthCtx, state)

  range.url("Login to GitHub", authUrl.toString())
})
