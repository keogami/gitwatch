import { connect } from "https://deno.land/x/redis/mod.ts"

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
