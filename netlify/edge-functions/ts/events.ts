import { PushEvent } from "https://cdn.skypack.dev/@octokit/webhooks-types?dts";

const defaultStringer = ({
  repository: { full_name },
  sender: { login },
}: PushEvent) =>
  `repo: <pre>${full_name}</pre>
sender: @${login}`;

const link = (text: string, url: string): string => {
  return `<a href="${url}">${text}</a>`
}

const pushStringer = (payload: PushEvent) => {
  const { repository, head_commit: head, sender } = payload;

  if (head === null) {
    throw new Error("head_commit is not set on push event")
  }

  const ref = (payload.ref as string).split("/")[2]; // just the name
  const action = (payload.created === true)
    ? "created"
    : (payload.deleted === true)
    ? "deleted"
    : (payload.forced === true)
    ? "forced pushed to"
    : "pushed to";
  const target = `${repository.full_name}:${ref}`;
  const by = link(`@${sender.login}`, sender.html_url)
  const summary = `${by} ${action}
<pre>${target}</pre>`;
  const commitID = `(${link(head.id.slice(0, 7), head.url)})`
  const commit = `${commitID}
${head.message}`;

  return summary + "\n\n" + commit;
};

const stringerMap = new Map([
  ["push", pushStringer],
]);

export default (event: string, payload: unknown) => {
  const s = () =>
    `type: ${event}
${defaultStringer(payload as PushEvent)}`;

  const stringer = stringerMap.get(event) ?? s;

  const response = stringer(payload as PushEvent);

  return response;
};
