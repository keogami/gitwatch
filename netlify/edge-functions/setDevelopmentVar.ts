import devvar, { DevelopmentVar, isDevelopment } from "./ts/development.ts"

let hasBeenSet = false

export default async (req: Request) => {
	console.table({dev: isDevelopment(), set: hasBeenSet})
	if (!isDevelopment() || hasBeenSet) {
		return new Response("Bad Kitty >:( (forbidden)", {
			status: 403,
			statusText: "FORBIDDEN"
		})
	}

	const {
		HOST_NAME
	} = await req.json()
	
	devvar.set(DevelopmentVar.Hostname, HOST_NAME)
	
	hasBeenSet = true
	return new Response("okay")
}
