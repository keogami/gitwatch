import { PushEvent } from "https://cdn.skypack.dev/@octokit/webhooks-types?dts"
import { pre } from "./commons.ts"

const defaultStringer = ({
  repository: { full_name },
  sender: { login },
}: PushEvent) =>
`repo: ${pre(full_name)}
sender: @${login}`

export default (event: string, payload: Object) => {
	return `type: ${event}
${defaultStringer(payload as PushEvent)}`
}