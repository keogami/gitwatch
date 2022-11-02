import { PushEvent } from "https://cdn.skypack.dev/@octokit/webhooks-types?dts"
import { pre, escape } from "./commons.ts"

const defaultStringer = ({
  repository: { full_name },
  sender: { login },
}: PushEvent) =>
`repo: ${pre(full_name)}
sender: @${login}`

const pushStringer = (payload: PushEvent) => {
	const ref = (payload.ref as string).split("/")[2] // just the name
	const action = (payload.created === true) ? "created"
							 : (payload.deleted === true) ? "deleted"
							 : (payload.forced === true)  ? "forced pushed to"
	             : "pushed to"
	const { repository, head_commit: head, sender } = payload
  const summary = `[@${sender.login}](${sender.html_url}) ${action} ${escape(repository.full_name)}\\:${ref}`
	const commit = `\\([${head.id.slice(0, 7)}](${head.url})\\) ${head.message}`
	
	return summary + "\n\n" + commit
}

const stringerMap = new Map([
	["push", pushStringer],
])

export default (event: string, payload: Object) => {
	const s = () => `type: ${event}
${defaultStringer(payload as PushEvent)}`
	
	const stringer = stringerMap.get(event) ?? s
	
	const response = stringer(payload)
	
	return response
}