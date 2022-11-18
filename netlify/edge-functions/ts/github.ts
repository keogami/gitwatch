import { getSiteHost } from "./commons.ts"
import { RedisMap } from "./redis.ts"

const GitHubClientSecret = Deno.env.get("GITHUB_CLIENT_SECRET")
const GitHubClientID = Deno.env.get("GITHUB_CLIENT_ID")
const GitHubAuthURL = "https://github.com/login/oauth/authorize"
const GitHubScopes = ["write:repo_hook", "admin:org_hook", "user"].join(" ")

if (typeof GitHubClientID === "undefined" || typeof GitHubClientSecret === "undefined") {
	throw new Error("GitHub credentials not found in the environment")
}

export const tokenStore = new RedisMap("token")

export const exchangeCode = async (code: string): Promise<string> => {
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

export const generateOauthURL = (ctx: string, state: string): URL => {
  const GitHubCallbackPath = `https://${getSiteHost()}/oauthCallback`
  const url = new URL(GitHubAuthURL)
  url.searchParams.set("client_id", GitHubClientID)
  url.searchParams.set("redirect_uri", GitHubCallbackPath)
  url.searchParams.set("scope", GitHubScopes)
  url.searchParams.set("state", `${ctx}:${state}`)

  return url
}