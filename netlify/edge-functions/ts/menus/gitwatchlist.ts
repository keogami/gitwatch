import { Menu } from "https://deno.land/x/grammy_menu@v1.1.2/menu.ts"
import { WebhookContext, webhookContextListStore, webhookContextStore } from "../github.ts"
import { translate } from "https://deno.land/x/base@2.0.4/mod.ts"
import { createClientFor } from "./gitwatch.ts"
import { isNone } from "https://deno.land/x/monads@v0.5.10/index.ts"

const hex = "0123456789abcedf"
const base254 = String.fromCharCode(
  ...(function* () {
    for (let i = 0; i < 256; i++) {
      if (i === "/".charCodeAt(0)) continue
      yield i
    }
  }()),
)

const packHook = (str: string): string => {
  return translate(str, hex, base254)
}

const unpackHook = (str: string): string => {
  return translate(str, base254, hex)
}

const createHookEndpoint = (ctx: WebhookContext) => {
  const endpoint = ("org" in ctx)
    ? "/orgs/{org}/hooks/{hook_id}"
    : "/repos/{owner}/{repo}/hooks/{hook_id}"
  
  const commonOption = {
    hook_id: ctx.hookID
  }
  
  const options = ("org" in ctx)
    ? { ...commonOption, org: ctx.org }
    : { ...commonOption, owner: ctx.owner, repo: ctx.name }

  return { endpoint, options }
}

const confirmDeleteMenu = new Menu("confirm-delete").dynamic((ctx, range) => {
  range.back({
    text: "no", payload: ctx.match as string
  })
  
  range.text({
    text: "yes", payload: ctx.match as string
  }, async ctx => {
      const hook = unpackHook(ctx.match as string) 
      const hookCtx = await webhookContextStore.get(hook)
      
      if (hookCtx === null) return
      
      const { endpoint, options } = createHookEndpoint(hookCtx)
      
      const uid = ctx.from.id.toString()
      
      const client = await createClientFor(uid)
      if (isNone(client)) return
      
      const resp = await client.unwrap().request(`DELETE ${endpoint}`, options)
      
      if (resp.status !== 204) {
        ctx.reply("Couldn't delete the hook.")
        return
      }
      
      await webhookContextStore.delete(hook)
      const cid = ctx.chat?.id?.toString() as string
      
      const list = await webhookContextListStore.get(cid)
      if (list === null) return

      await webhookContextListStore.set(cid, list.filter(it => it !== hook))
      
      ctx.reply("/gitwatch is no longer watching that.")
      ctx.menu.close()
    })
})
const configMenu = new Menu("config").dynamic((ctx, range) => {
  range.submenu({
    text: "unwatch", payload: ctx.match as string
  }, "confirm-delete").row()
  
  range.submenu({
    text: "events",
    payload: ctx.match as string
  }, "events").row()
  
  range.back({
    text: "back", payload: ctx.match as string
  })
})

configMenu.register(confirmDeleteMenu)

export const watchlistMenu = new Menu("watchlist").dynamic(
  async (ctx, range) => {
    const list = await webhookContextListStore.get(
      ctx.chat?.id.toString() as string,
    )
    if (list === null) {
      return
    }
    console.log(list)
    const hydrated = await Promise.all(
      list.map((it) =>
        webhookContextStore.get(it).then((
          val,
        ): [string, typeof val] => [it, val])
      ),
    )

    hydrated.forEach(([hook, it]) => {
      if (it === null) return

      const value = ("org" in it) ? it.org : `${it.owner}/${it.name}`

      range.submenu({
        text: value,
        payload: packHook(hook),
      }, "config").row()
    })
  },
)
watchlistMenu.register(configMenu)
