import { Bot } from "https://deno.land/x/grammy@v1.12.0/bot.ts"
import { TELEGRAM_TOKEN } from "./ts/commons.ts"
import { oauthSessions } from "./ts/oauth.ts"
import { RedisMap } from "./ts/redis.ts"

if (typeof TELEGRAM_TOKEN === "undefined") {
	throw new Error("Couldn't find the telegram token in the environment")
}

const bot = new Bot(TELEGRAM_TOKEN)

const GitHubClientID = Deno.env.get("GITHUB_CLIENT_ID")
const GitHubClientSecret = Deno.env.get("GITHUB_CLIENT_SECRET")

if (typeof GitHubClientID === "undefined" || typeof GitHubClientSecret === "undefined") {
	throw new Error("GitHub credentials not found in the environment")
}

const tokenStore = new RedisMap("token")

const exchangeCode = async (code: string): Promise<string> => {
	const body = new FormData()
	body.set("client_id", GitHubClientID)
	body.set("client_secret", GitHubClientSecret)
	body.set("code", code)

	const req = new Request("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: [
			["Accept", "application/json"]
		],
		body
	})
	
	const res = await (await fetch(req)).json()
	if (res?.access_token === null || typeof res?.access_token === "undefined") {
		console.error(res)
		throw new Error("the access_token was not found in the response from github")
	}
	
	return res.access_token
}

export default async (req: Request) => {
	const params = new URL(req.url).searchParams
	const stateParam = params.get("state")
	if (stateParam === null) {
		throw new Error("state param was not found in the callback")
	}
	const [oauthCtx, state] = stateParam.split(":")
	
	const oauthData = await oauthSessions.get(oauthCtx)
	if (oauthData === null) {
		throw new Error("there's no oauth data associated with that context")
	}
	
	oauthSessions.delete(oauthCtx)
	
	if (oauthData.state !== state) {
		throw new Error("the state param in the callback doesn't match the expected state. is this an attack?")
	}
	
	const code = params.get("code")
	if (code === null) {
		throw new Error("code param was not found in the callback")
	}
	
	const token = await exchangeCode(code)
	
	const inserted = await tokenStore.set(oauthData.uid, token)
	if (!inserted) {
		throw new Error("couldn't store the token in the token store")
	}
	
	bot.api.sendMessage(oauthData.cid, "Authentication was successful. UID: " + oauthData.uid)
  return new Response()
}
