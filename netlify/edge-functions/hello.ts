const data = {
  myVar: Deno.env.get("MY_VAR"),
  url: Deno.env.get("DEPLOY_URL"),
}

export default async (_req: Request) => new Response(JSON.stringify(data))
