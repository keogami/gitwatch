import { callback } from "./ts/bot.ts"

export default async (req: Request) => {
  return await callback(req)
}
