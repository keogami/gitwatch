import { connect } from "https://deno.land/x/redis/mod.ts"
import { DBMap } from "./dbmap.ts"

const hostname = Deno.env.get("REDIS_HOST")
const port = Deno.env.get("REDIS_PORT")
const password = Deno.env.get("REDIS_PASSWORD")
const scope = Deno.env.get("REDIS_SCOPE")

if (typeof hostname === "undefined") {
	throw new Error("Redis hostname not found in the evironment")
}

if (typeof port === "undefined") {
	throw new Error("Redis port not found in the environment")
}

if (typeof password === "undefined") {
	throw new Error("Redis password not found in the environment")
}

if (typeof scope === "undefined") {
	throw new Error("Redis scope not found in the environment")
}

const redis = await connect({
	hostname, port, password
})

export const scoped = (key: string): string => `${key}:${scope}`
export default redis

export class RedisMap<Key extends string | number = string, Value = string> implements DBMap<Key, Value> {
	identifier: string

	constructor(identifier: string) {
		if (identifier === "") {
			throw new Error("RedisMap: shouldn't construct with an empty identifier")
		}

		this.identifier = scoped(identifier)
	}
	
	async get(key: Key): Promise<Value | null> {
		const res = await redis.hget(this.identifier, key.toString())
		if (res === null) return null
		return JSON.parse(res) as Value
	}
	
	async set(key: Key, value: Value): Promise<boolean> {
		const res = await redis.hset(this.identifier, key.toString(), JSON.stringify(value))
		return res === 1
	}
	
	async has(key: Key): Promise<boolean> {
		const res = await redis.hexists(this.identifier, key.toString())
		return res === 1
	}
	
	async delete(key: Key): Promise<boolean> {
		const res = await redis.hdel(this.identifier, key.toString())
		return res === 1
	}
}
