import { Menu } from "https://deno.land/x/grammy_menu@v1.1.2/menu.ts"
import { webhookContextListStore, webhookContextStore } from "../github.ts"
import { translate } from "https://deno.land/x/base@2.0.4/mod.ts"

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

const configMenu = new Menu("config").dynamic((ctx, range) => {
  range.text({
    text: "delete", payload: ctx.match as string
  }, ctx => ctx.reply(unpackHook(ctx.match as string)))
})

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
