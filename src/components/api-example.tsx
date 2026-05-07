"use client"

import { useEffect, useState } from "react"
import { highlightCode } from "@/actions/highlight"

const HOST = "https://json.shahriyar.dev"
const KEY = "js_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

const tabs = ["javascript", "python", "go", "curl"] as const
type Tab = (typeof tabs)[number]

const langToShiki: Record<Tab, string> = {
  javascript: "javascript",
  python: "python",
  go: "go",
  curl: "bash",
}

function jsExample(
  method: string,
  path: string,
  body?: string,
  auth?: boolean,
): string {
  const lines: string[] = []

  if (method === "GET" && !auth) {
    lines.push('const res = await fetch("' + HOST + path + '")')
  } else {
    lines.push('const res = await fetch("' + HOST + path + '", {')
    lines.push('  method: "' + method + '",')
    if (auth) lines.push('  headers: { Authorization: "Bearer ' + KEY + '" },')
    if (body) {
      if (!auth)
        lines.push('  headers: { "Content-Type": "application/json" },')
      lines.push("  body: JSON.stringify({...}),")
    }
    lines.push("})")
  }

  lines.push("const data = await res.json()")
  lines.push("console.log(data)")
  return lines.join("\n")
}

function pyExample(
  method: string,
  path: string,
  body?: string,
  auth?: boolean,
): string {
  const url = HOST + path
  const lines: string[] = ["import requests"]
  lines.push("")

  if (method === "GET" && !auth) {
    lines.push('response = requests.get("' + url + '")')
  } else if (body) {
    const payload = body.replace(/'/g, '"')
    lines.push("headers = {}")
    if (auth) lines.push("headers['Authorization'] = 'Bearer " + KEY + "'")
    lines.push("response = requests.request(")
    lines.push("    '" + method + "',")
    lines.push("    '" + url + "',")
    if (auth) lines.push("    headers=headers,")
    lines.push("    json=" + payload + ",")
    lines.push(")")
  } else {
    lines.push("headers = {}")
    if (auth) lines.push("headers['Authorization'] = 'Bearer " + KEY + "'")
    lines.push(
      'response = requests.request("' +
        method +
        '", "' +
        url +
        '", headers=headers)',
    )
  }

  lines.push("data = response.json()")
  lines.push("print(data)")
  return lines.join("\n")
}

function goExample(
  method: string,
  path: string,
  body?: string,
  auth?: boolean,
): string {
  const url = HOST + path
  const lines: string[] = [
    "package main",
    "",
    "import (",
    '  "bytes"',
    '  "encoding/json"',
    '  "fmt"',
    '  "log"',
    '  "net/http"',
    ")",
    "",
    "func main() {",
  ]

  if (body) {
    lines.push("  var payload interface{}")
    lines.push("  json.Unmarshal([]byte(`" + body + "`), &payload)")
    lines.push("  bodyBytes, _ := json.Marshal(payload)")
    lines.push(
      '  req, _ := http.NewRequest("' +
        method +
        '", "' +
        url +
        '", bytes.NewBuffer(bodyBytes))',
    )
    if (auth)
      lines.push('  req.Header.Set("Authorization", "Bearer ' + KEY + '")')
    lines.push('  req.Header.Set("Content-Type", "application/json")')
  } else if (method === "GET" && !auth) {
    lines.push('  resp, err := http.Get("' + url + '")')
    lines.push("  if err != nil {")
    lines.push("    log.Fatal(err)")
    lines.push("  }")
    lines.push("  defer resp.Body.Close()")
    lines.push("")
    lines.push("  var data interface{}")
    lines.push("  json.NewDecoder(resp.Body).Decode(&data)")
    lines.push("  fmt.Println(data)")
    lines.push("}")
    return lines.join("\n")
  } else {
    lines.push(
      '  req, _ := http.NewRequest("' + method + '", "' + url + '", nil)',
    )
    if (auth)
      lines.push('  req.Header.Set("Authorization", "Bearer ' + KEY + '")')
  }

  lines.push("")
  lines.push("  client := &http.Client{}")
  lines.push("  resp, err := client.Do(req)")
  lines.push("  if err != nil {")
  lines.push("    log.Fatal(err)")
  lines.push("  }")
  lines.push("  defer resp.Body.Close()")
  lines.push("")
  lines.push("  var data interface{}")
  lines.push("  json.NewDecoder(resp.Body).Decode(&data)")
  lines.push("  fmt.Println(data)")
  lines.push("}")

  return lines.join("\n")
}

function curlExample(
  method: string,
  path: string,
  body?: string,
  auth?: boolean,
): string {
  const parts: string[] = ["curl -X " + method + ' "' + HOST + path + '"']
  if (auth) parts.push('-H "Authorization: Bearer ' + KEY + '"')
  if (body) {
    parts.push('-H "Content-Type: application/json"')
    parts.push("-d '" + body + "'")
  }
  return parts.join(" \\\n  ")
}

const generators: Record<Tab, typeof jsExample> = {
  javascript: jsExample,
  python: pyExample,
  go: goExample,
  curl: curlExample,
}

const labels: Record<Tab, string> = {
  javascript: "JavaScript",
  python: "Python",
  go: "Go",
  curl: "cURL",
}

export function ApiExample({
  method = "GET",
  path,
  body,
  auth,
}: {
  method?: string
  path: string
  body?: string
  auth?: boolean
}) {
  const [tab, setTab] = useState<Tab>("javascript")
  const [highlighted, setHighlighted] = useState<Partial<Record<Tab, string>>>(
    {},
  )

  useEffect(() => {
    const code = generators[tab](method, path, body, auth)
    highlightCode(code, langToShiki[tab]).then((html) => {
      setHighlighted((prev) => ({ ...prev, [tab]: html }))
    })
  }, [tab, method, path, body, auth])

  const code = generators[tab](method, path, body, auth)
  const html = highlighted[tab]

  return (
    <div className="mb-6 overflow-hidden rounded-lg border">
      <div className="flex items-center gap-3 border-b bg-muted px-4 py-3 font-mono text-sm">
        <span className="rounded bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          {method}
        </span>
        <div className="min-w-0 overflow-x-auto">
          <span className="whitespace-nowrap text-foreground">{path}</span>
        </div>
      </div>
      <div className="border-b">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                "px-4 py-2 text-xs font-medium " +
                (tab === t
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {labels[t]}
            </button>
          ))}
        </div>
      </div>
      {html ? (
        <div
          className="overflow-x-auto bg-muted/50 p-4 font-mono text-xs leading-relaxed [&_.shiki]:!m-0 [&_.shiki]:!bg-transparent [&_.shiki]:!p-0"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto bg-muted/50 p-4 font-mono text-xs leading-relaxed">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}
