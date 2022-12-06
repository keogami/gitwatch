import { Menu } from "https://deno.land/x/grammy_menu@v1.1.2/menu.ts"
import { webhookContextListStore, webhookContextStore } from "../github.ts"

export const watchlistMenu = new Menu("watchlist").dynamic(
  async (ctx, range) => {
    const list = await webhookContextListStore.get(
      ctx.chat?.id.toString() as string,
    )
    if (list === null) {
      return
    }
    console.log(list)
    const hydrated = await Promise.all(list.map((it) =>
      webhookContextStore.get(it)
    ))
    hydrated.forEach((it) => {
      if (it === null) return

      const value = ("org" in it) ? it.org : `${it.owner}/${it.name}`

      range.text(value, (ctx) => ctx.reply("peru nyaa~")).row()
    })
  },
)
