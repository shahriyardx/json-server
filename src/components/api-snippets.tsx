"use client"

import { useEffect, useState } from "react"
import { highlightCode } from "@/actions/highlight"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

const languages = [
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "curl", label: "cURL" },
  { id: "go", label: "Go" },
] as const

type LangId = (typeof languages)[number]["id"]

const templates: Record<LangId, (url: string) => string> = {
  javascript: (url) => `const res = await fetch('${url}')
const data = await res.json()
console.log(data)`,

  python: (url) => `import requests

response = requests.get('${url}')
data = response.json()
print(data)`,

  curl: (url) => `curl ${url}`,

  go: (url) => `package main

import (
  "encoding/json"
  "fmt"
  "log"
  "net/http"
)

func main() {
  resp, err := http.Get("${url}")
  if err != nil {
    log.Fatal(err)
  }
  defer resp.Body.Close()

  var data interface{}
  json.NewDecoder(resp.Body).Decode(&data)
  fmt.Println(data)
}`,
}

const langToShiki: Record<LangId, string> = {
  javascript: "javascript",
  python: "python",
  curl: "bash",
  go: "go",
}

export function ApiSnippets({ url }: { url: string }) {
  const [lang, setLang] = useState<LangId>("javascript")
  const [copied, setCopied] = useState(false)
  const [highlighted, setHighlighted] = useState<
    Partial<Record<LangId, string>>
  >({})

  useEffect(() => {
    highlightCode(templates[lang](url), langToShiki[lang]).then((h) => {
      setHighlighted((prev) => ({ ...prev, [lang]: h }))
    })
  }, [lang, url])

  const code = templates[lang](url)
  const html = highlighted[lang]

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">Fetch this JSON</h3>
      <Tabs value={lang} onValueChange={(v) => setLang(v as LangId)}>
        <TabsList>
          {languages.map((l) => (
            <TabsTrigger key={l.id} value={l.id}>
              {l.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {languages.map((l) => (
          <TabsContent key={l.id} value={l.id}>
            <div className="relative">
              {html && lang === l.id ? (
                <div
                  className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed [&_.shiki]:!m-0 [&_.shiki]:!bg-transparent [&_.shiki]:!p-0"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed">
                  <code>{templates[l.id](url)}</code>
                </pre>
              )}
              <button
                type="button"
                onClick={copy}
                className="absolute right-2 top-2 rounded border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
