export function isDevelopment(): boolean {
	return Boolean(Deno.env.get("NETLIFY_DEV")) === true
}

export enum DevelopmentVar {
	Hostname,
}

const store: Map<DevelopmentVar, string> = new Map()

export default store
