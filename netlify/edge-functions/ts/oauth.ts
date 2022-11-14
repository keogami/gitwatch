import { toHashString } from "https://deno.land/std/crypto/mod.ts" 
import redis, { scoped } from "./redis.ts"

const OauthSessionCtxMapKey = scoped("oauth")

export interface OauthData {
  uid: string, // id of the user
  cid: string, // id of the chat
}

export const oauthSessions = {
  async generateContext(uid: string): Promise<string> {
    const data = new TextEncoder().encode(uid)
    return toHashString(await crypto.subtle.digest("sha-1", data), "hex")
  },

  async has(uid: string): Promise<boolean> {
    const ctx = await this.generateContext(uid)
    const res = await redis.hexists(OauthSessionCtxMapKey, ctx)
    return res === 1
  },

  async create(data: OauthData): Promise<string> {
    const ctx = await this.generateContext(data.uid)
    const res = await redis.hset(OauthSessionCtxMapKey, ctx, JSON.stringify(data))

    if (res !== 1) {
      throw new Error("Redis: couldn't create oauth session")
    }

    return ctx
  },

  async retreive(ctx: string): Promise<OauthData | null> {
    const data = await redis.hget(OauthSessionCtxMapKey, ctx)

    if (data === null) return null
    return JSON.parse(data) as OauthData
  }
}

