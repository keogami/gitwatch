import { Menu } from "https://deno.land/x/grammy_menu@v1.1.2/menu.ts"
import { EventID, tokenStore, WebhookContext, webhookContextListStore, webhookContextStore } from "../github.ts"
import { translate } from "https://deno.land/x/base@2.0.4/mod.ts"
import { Octokit } from "https://cdn.skypack.dev/octokit"

const hex = "0123456789abcedf"
const base = String.fromCharCode(
  ...(function* (...excludeStr: string[]) {
    const excludes = excludeStr.map(it => it.charCodeAt(0))
    for (let i = 0; i < 256; i++) {
      if (excludes.includes(i)) continue
      yield i
    }
  }("/")),
)

const packHook = (str: string): string => {
  return translate(str, hex, base)
}

const unpackHook = (str: string): string => {
  return translate(str, base, hex)
}

class Hook {
  constructor(public ctx: WebhookContext, public token: string) {}
  
  private endpoint() {
    const { ctx } = this
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
  
  async delete() {
    const { endpoint, options } = this.endpoint()

    await new Octokit({
      auth: this.token
    }).request(`DELETE ${endpoint}`, options)
  }
  
  async get() {
    const { endpoint, options } = this.endpoint()
    
    return await new Octokit({
      auth: this.token
    }).request(`GET ${endpoint}`, options)
  }
  
  async update(opts?: {
    add_events?: EventID[]
    remove_events?: EventID[]
    active?: boolean
  }) {
    const { endpoint, options } = this.endpoint()
    
    return await new Octokit({
      auth: this.token
    }).request(`PATCH ${endpoint}`, {
        ...options, ...opts
      })
  }
  
  async addEvents(...evs: EventID[]) {
    return await this.update({
      add_events: evs
    })
  }
  
  async removeEvents(...evs: EventID[]) {
    return await this.update({
      remove_events: evs
    })
  }

  async activate() {
    return await this.update({
      active: true
    })
  }

  async deactivate() {
    return await this.update({
      active: false
    })
  }
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

      const { cid } = hookCtx
      const uid = ctx.from.id.toString()
      
      const token = await tokenStore.get(uid)
      if (token === null) return
      
      await new Hook(hookCtx, token).delete()
      
      await webhookContextStore.delete(hook)
      
      const list = await webhookContextListStore.get(cid)
      if (list === null) return

      await webhookContextListStore.set(cid, list.filter(it => it !== hook))
      
      ctx.reply("/gitwatch is no longer watching that.")
      ctx.menu.close()
    })
})

const eventsMenu = new Menu("events").text({
  text: "all", payload: ctx => ctx.match as string
}, ctx => ctx.reply("blah"))

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
