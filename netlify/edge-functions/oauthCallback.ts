import bot from "./ts/bot.ts"
import { exchangeCode, tokenStore } from "./ts/github.ts"
import { oauthSessions } from "./ts/oauth.ts"


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
	
	await tokenStore.set(oauthData.uid, token)
	
	bot.api.sendMessage(oauthData.cid, "Authentication was successful. UID: " + oauthData.uid)
  return new Response()
}
