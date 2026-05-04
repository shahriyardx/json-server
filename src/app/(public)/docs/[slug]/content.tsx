import type { ReactNode } from "react"
import { Comark } from "@comark/react"
import { codeToHtml } from "shiki"

type HtmlProps = { children?: ReactNode; className?: string; [key: string]: unknown }
type Segment =
  | { type: "markdown"; content: string }
  | { type: "html"; html: string }

const codeBlockRe = /```(js|json)\n([\s\S]*?)```/g

async function processCodeBlocks(content: string): Promise<Segment[]> {
  const segments: Segment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = codeBlockRe.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "markdown", content: content.slice(lastIndex, match.index) })
    }
    const lang = match[1]
    const code = match[2].replace(/\n$/, "")
    const html = await codeToHtml(code, {
      lang,
      themes: { light: "github-light", dark: "github-dark-dimmed" },
    })
    segments.push({ type: "html", html })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    segments.push({ type: "markdown", content: content.slice(lastIndex) })
  }

  return segments
}

function HttpExample({ method = "GET", path = "/" }: { method?: string; path?: string }) {
  return (
    <div className="mb-4 overflow-hidden rounded-lg border">
      <div className="flex items-center gap-3 bg-muted px-4 py-3 font-mono text-sm">
        <span className="rounded bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          {method}
        </span>
        <span className="text-foreground">{path}</span>
      </div>
    </div>
  )
}

const components = {
  http: HttpExample,
  h1: ({ children, ...props }: HtmlProps) => (
    <h1 className="mb-4 text-3xl font-bold tracking-tight scroll-mt-24" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: HtmlProps) => (
    <h2 className="mb-3 mt-10 text-xl font-semibold tracking-tight scroll-mt-24" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: HtmlProps) => (
    <h3 className="mb-2 mt-8 text-lg font-medium scroll-mt-24" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }: HtmlProps) => (
    <p className="mb-4 text-sm leading-relaxed text-muted-foreground" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }: HtmlProps) => (
    <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-muted-foreground" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: HtmlProps) => (
    <ol className="mb-4 list-inside list-decimal space-y-1 text-sm text-muted-foreground" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: HtmlProps) => (
    <li className="text-sm text-muted-foreground" {...props}>
      {children}
    </li>
  ),
  a: ({ href, children, ...props }: HtmlProps & { href?: string }) => (
    <a
      className="text-primary underline underline-offset-2 hover:text-primary/80"
      href={href}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      {...props}
    >
      {children}
    </a>
  ),
  code: ({ children, className, ...props }: HtmlProps) => {
    if (!className) {
      return (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs" {...props}>
          {children}
        </code>
      )
    }
    return (
      <pre className="mb-4 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    )
  },
  table: ({ children, ...props }: HtmlProps) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: HtmlProps) => (
    <thead className="border-b text-left" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }: HtmlProps) => (
    <th className="pb-2 pr-4 font-medium text-muted-foreground" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: HtmlProps) => (
    <td className="pb-2 pr-4 text-muted-foreground" {...props}>
      {children}
    </td>
  ),
  tr: ({ children, ...props }: HtmlProps) => (
    <tr className="border-b last:border-0" {...props}>
      {children}
    </tr>
  ),
  hr: (props: HtmlProps) => <hr className="my-8 border-muted" {...props} />,
  blockquote: ({ children, ...props }: HtmlProps) => (
    <blockquote className="mb-4 border-l-2 border-muted-foreground/30 pl-4 text-sm italic text-muted-foreground" {...props}>
      {children}
    </blockquote>
  ),
}

export async function DocContent({ content }: { content: string }) {
  const segments = await processCodeBlocks(content)

  return (
    <article className="prose-custom">
      {segments.map((seg, i) =>
        seg.type === "markdown" ? (
          <Comark key={i} components={components}>
            {seg.content}
          </Comark>
        ) : (
          <div
            key={i}
            className="mb-4 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed [&_.shiki]:!m-0 [&_.shiki]:!bg-transparent [&_.shiki]:!p-0"
            dangerouslySetInnerHTML={{ __html: seg.html }}
          />
        ),
      )}
    </article>
  )
}
