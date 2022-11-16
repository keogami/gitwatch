import devvar, { DevelopmentVar } from "./development.ts";

const SITE_HOST = Deno.env.get("SITE_HOST")

if (typeof SITE_HOST === "undefined") {
  throw new Error("SITE_HOST is not found")
}

export const getSiteHost = (): string =>
  devvar.get(DevelopmentVar.Hostname) ?? SITE_HOST
