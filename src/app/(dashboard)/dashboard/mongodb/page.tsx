"use client"

import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"
import { highlightCode } from "@/actions/highlight"

export default function MongoDBPage() {
  const { data: session } = authClient.useSession()
  const [copied, setCopied] = useState(false)
  const [highlighted, setHighlighted] = useState("")

  const platformUsername = session?.user?.username
  const connectionUri = platformUsername
    ? `mongodb://<username>:<password>@${platformUsername}.json.shahriyar.dev/mydb`
    : "mongodb://<username>:<password>@yourusername.json.shahriyar.dev/mydb"

  const copyUri = () => {
    navigator.clipboard.writeText(connectionUri)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const codeSample = `import { MongoClient } from "mongojson"

const client = new MongoClient(
  "${connectionUri}"
)

const db = client.db()
const users = db.collection("users")

// Insert a document (auto-generates _id)
const result = await users.insertOne({
  name: "John",
  email: "john@example.com",
})

// Query documents
const all = await users.find().toArray()
console.log(all)`

  useEffect(() => {
    highlightCode(codeSample, "typescript").then(setHighlighted)
  }, [codeSample])

  return (
    <div className="p-5">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Cluster</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your MongoDB cluster
        </p>
      </div>

      {/* Connection URI */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-foreground">
            Connection URI
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyUri}
            className="gap-1.5"
          >
            {copied ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <code className="block text-sm text-foreground break-all font-mono bg-background rounded border px-3 py-2">
          {connectionUri}
        </code>
        <p className="mt-2 text-xs text-muted-foreground">
          Replace <span className="font-mono">&lt;username&gt;</span> and{" "}
          <span className="font-mono">&lt;password&gt;</span> with auth user
          credentials.
        </p>
      </div>

      {/* Code example */}
      <div className="mt-6 max-w-xl">
        <p className="mb-2 text-sm font-medium text-foreground">Quick start</p>
        <div
          className="overflow-x-auto rounded-lg border bg-background p-4 text-xs leading-relaxed [&_.shiki]:m-0! [&_.shiki]:bg-transparent! [&_.shiki]:p-0!"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
    </div>
  )
}
