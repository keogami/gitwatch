import { toHashString } from "https://deno.land/std/crypto/mod.ts" 
import { RedisMap } from "./redis.ts"

export interface OauthData {
  uid: string, // id of the user
  cid: string, // id of the chat
	state: string, // a random string for security
}

export type Context = string

export const generateContext = async (uid: string): Promise<Context> => {
  const data = new TextEncoder().encode(uid)
  return toHashString(await crypto.subtle.digest("sha-1", data), "hex")
}

class OauthSessions extends RedisMap<Context, OauthData> {
  constructor() {
    super("oauth")
  }
}

export const oauthSessions = new OauthSessions()
