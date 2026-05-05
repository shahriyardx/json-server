"use client"

import { useState, useMemo } from "react"

export function DocClient({
  baseUrl,
  initialJson,
}: {
  baseUrl: string
  initialJson: string
}) {
  const [path, setPath] = useState("")
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const data = useMemo(() => JSON.parse(initialJson), [initialJson])
  const isRootArray = Array.isArray(data)
  const rootKeys = !isRootArray ? Object.keys(data) : []
  const firstKey = rootKeys[0]

  const tryRequest = async () => {
    const url = `${window.location.origin}${baseUrl}${path}`
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch(url)
      const text = await res.text()
      if (!res.ok) {
        setError(`${res.status} ${text}`)
      } else {
        setResponse(JSON.stringify(JSON.parse(text), null, 2))
      }
    } catch {
      setError("Request failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Try It</h2>

      <div className="mb-4 flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="doc-path" className="mb-1 block text-xs text-muted-foreground">Path</label>
          <div className="flex items-center border">
            <span className="shrink-0 px-3 py-2 text-xs text-muted-foreground">
              {baseUrl}
            </span>
            <input
              id="doc-path"
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/products/0"
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
              onKeyDown={(e) => e.key === "Enter" && tryRequest()}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={tryRequest}
          disabled={loading}
          className="border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {loading ? "..." : "GET"}
        </button>
      </div>

      <div className="mb-4">
        <p className="mb-1 block text-xs text-muted-foreground">cURL</p>
        <div className="border bg-muted px-4 py-3">
          <code className="text-xs break-all">{`curl ${window.location.origin}${baseUrl}${path}`}</code>
        </div>
      </div>

      {error && (
        <div className="mb-4 border border-red-500/30 bg-red-500/5 px-4 py-3">
          <code className="text-xs text-red-500">{error}</code>
        </div>
      )}

      {response && (
        <div className="mb-4">
          <div className="border-b bg-muted px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground">RESPONSE</span>
          </div>
          <pre className="overflow-x-auto border px-4 py-3">
            <code className="text-xs">{response}</code>
          </pre>
        </div>
      )}

      <div className="mb-4">
        <h3 className="mb-2 text-sm font-medium">Full JSON</h3>
        <pre className="max-h-96 overflow-x-auto overflow-y-auto border px-4 py-3">
          <code className="text-xs">{initialJson}</code>
        </pre>
      </div>

      <div className="mb-4">
        <h3 className="mb-2 text-sm font-medium">Example Requests</h3>
        <div className="space-y-2 text-sm">
          <div className="border">
            <div className="flex items-center gap-3 border-b bg-muted px-4 py-2">
              <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">GET</span>
              <code className="text-xs">{baseUrl}</code>
            </div>
            <div className="px-4 py-2 text-xs text-muted-foreground">Full JSON file</div>
          </div>
          {isRootArray && (
            <div className="border">
              <div className="flex items-center gap-3 border-b bg-muted px-4 py-2">
                <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">GET</span>
                <code className="text-xs">{baseUrl}?search=term</code>
              </div>
              <div className="px-4 py-2 text-xs text-muted-foreground">Search across fields</div>
            </div>
          )}
          {firstKey && (
            <div className="border">
              <div className="flex items-center gap-3 border-b bg-muted px-4 py-2">
                <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">GET</span>
                <code className="text-xs">{baseUrl}/{firstKey}</code>
              </div>
              <div className="px-4 py-2 text-xs text-muted-foreground">Access &quot;{firstKey}&quot; field</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
