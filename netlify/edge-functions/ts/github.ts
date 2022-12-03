import { Octokit } from "https://cdn.skypack.dev/octokit"
import { toHashString } from "https://deno.land/std@0.164.0/crypto/util.ts"
import { Result, Ok, Err } from "https://deno.land/x/monads@v0.5.10/index.ts"
import { getSiteHost } from "./commons.ts"
import { RedisMap } from "./redis.ts"

const GitHubClientSecret = Deno.env.get("GITHUB_CLIENT_SECRET")
const GitHubClientID = Deno.env.get("GITHUB_CLIENT_ID")
const GitHubAuthURL = "https://github.com/login/oauth/authorize"
const GitHubScopes = [
  "write:repo_hook",
  "admin:org_hook",
  "user",
  "read:org"
].join(" ")

if (
  typeof GitHubClientID === "undefined" ||
  typeof GitHubClientSecret === "undefined"
) {
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
      ["Accept", "application/json"],
    ],
    body,
  })

  const res = await (await fetch(req)).json()
  if (res?.access_token === null || typeof res?.access_token === "undefined") {
    console.error(res)
    throw new Error(
      "the access_token was not found in the response from github",
    )
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

interface SetupRepoWebhookOptions {
  name: string
  owner: string
  uid: string
  cid: string
}

interface SetupOrgWebhookOptions {
  org: string
  uid: string
  cid: string
}

type SetupWebhookOptions
  = SetupRepoWebhookOptions
  | SetupOrgWebhookOptions

export type WebhookContext =
  Pick<SetupWebhookOptions, "uid" | "cid">

export const webhookContextStore =
  new RedisMap<string, WebhookContext>(
    "webhook",
  )

export const setupWebhook = async (
  options: SetupWebhookOptions,
): Promise<Result<string, Error>> => {
  const { uid, cid } = options
  
  const token = await tokenStore.get(uid)
  if (token === null) {
    return Err(new Error("Couldn't find your token."))
  }

  const ctx = toHashString(
    await crypto.subtle.digest(
      "sha-1",
      new TextEncoder().encode(uid.toString()),
    ),
  )
         
  await webhookContextStore.set(ctx, {
    uid, cid,
  })
  
  const client = new Octokit({
    userAgent: "gitwatch",
    auth: token,
  })
  
  const endpoint = ("org" in options)
    ? "/orgs/{org}/hooks"
    : "/repos/{owner}/{repo}/hooks"
  
  const commonOptions = {
    name: "web",
    active: true, events: ["*"], config: {
      url: `https://${getSiteHost()}/watch?ctx=${ctx}`,
      content_type: "json"
    }
  }
  
  const config = ("org" in options)
    ? { ...commonOptions, org: options.org }
    : { ...commonOptions, repo: options.name, owner: options.owner }
  
  const resp: Response = await client.request(`POST ${endpoint}`, config)
  
  if (resp.status !== 201) {
    return Err(new Error("Couldn't create the webhook"))
  }

  return Ok(ctx)
}
