import { Base } from "https://deno.land/x/base@2.0.4/mod.ts";
import { safeCompactBase } from "./safe-compact-base.ts";

export const EventList = [
  "*",
  "branch_protection_rule",
  "check_run",
  "check_suite",
  "code_scanning_alert",
  "commit_comment",
  "create",
  "delete",
  "dependabot_alert",
  "deploy_key",
  "deployment",
  "deployment_status",
  "discussion",
  "discussion_comment",
  "fork",
  "github_app_authorization",
  "gollum",
  "installation",
  "installation_repositories",
  "installation_target",
  "issue_comment",
  "issues",
  "label",
  "marketplace_purchase",
  "member",
  "membership",
  "merge_group",
  "meta",
  "milestone",
  "org_block",
  "organization",
  "package",
  "page_build",
  "ping",
  "project_card",
  "project",
  "project_column",
  "projects_v2_item",
  "public",
  "pull_request",
  "pull_request_review_comment",
  "pull_request_review",
  "pull_request_review_thread",
  "push",
  "registry_package",
  "release",
  "repository",
  "repository_dispatch",
  "repository_import",
  "repository_vulnerability_alert",
  "secret_scanning_alert",
  "secret_scanning_alert_location",
  "security_advisory",
  "security_and_analysis",
  "sponsorship",
  "star",
  "status",
  "team_add",
  "team",
  "user",
  "watch",
  "workflow_dispatch",
  "workflow_job",
  "workflow_run"
] as const

export type EventID = typeof EventList[number]
export const EventIDIndex = Object.freeze(EventList.reduce(
  (acc, it, idx) => { acc[it] = idx; return acc },
  {} as Record<EventID, number>
))

export type Events = EventID[]
export const AllEvents: Readonly<Events> = ["*"]
export const PushOnlyEvents: Readonly<Events> = ["push"]
export const CommonEvents: Readonly<Events> = [
  "push", "pull_request", "ping",
  "issues", "create", "delete"
]

export const packEvents = (evs: Readonly<Events>): string => {
  const packed = evs
    .map(it => BigInt(EventIDIndex[it]))
    .map(it => 1n << it)
    .reduce((acc, it) => acc | it, 0n)

  return new Base(safeCompactBase).encode(packed)
}

export const unpackEvents = (str: string): Events => {
  const decoded = new Base(safeCompactBase).decode(str)
  return decoded.toString(2).split("").reverse()
    .map((it, idx) => [Number(it), idx])
    .filter(([it, _]) => it !== 0)
    .map(([_, idx]) => EventList[idx])
}

export const EventPresets = Object.freeze(
  [AllEvents, PushOnlyEvents, CommonEvents]
  .reduce(
    (acc, it) => { acc[packEvents(it)] = it; return acc },
    {} as Record<string, Readonly<Events>>
  )
)
