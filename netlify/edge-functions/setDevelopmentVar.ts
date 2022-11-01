import devvar, { DevelopmentVar } from "./ts/development.ts"

export default async (req: Request) => {
	const {
		HOST_NAME
	} = await req.json()
	
	devvar.set(DevelopmentVar.Hostname, HOST_NAME)
	
	console.log(devvar.get(DevelopmentVar.Hostname))
	
	return new Response("okay")
}
