export function isDevelopment(): boolean {
	return Deno.env.get("NETLIFY_DEV") === true
}

export enum DevelopmentVar {
	Hostname,
}

const store: Map<DevelopmentVar, string> = new Map()

export default store
