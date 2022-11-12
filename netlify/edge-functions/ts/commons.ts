import devvar, { DevelopmentVar, isDevelopment } from "./development.ts";

export const TELEGRAM_TOKEN = isDevelopment()
  ? Deno.env.get("TELEGRAM_DEV_TOKEN")
  : Deno.env.get("TELEGRAM_TOKEN");

const SITE_HOST = Deno.env.get("SITE_HOST")

if (typeof SITE_HOST === "undefined") {
  throw new Error("SITE_HOST is not found")
}

export const getSiteHost = (): string =>
  devvar.get(DevelopmentVar.Hostname) ?? SITE_HOST
