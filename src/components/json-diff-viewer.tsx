"use client"

interface JsonDiffViewerProps {
  oldContent: string
  newContent: string
}

interface DiffLine {
  type: "same" | "added" | "removed"
  oldLine?: string
  newLine?: string
  oldNum?: number
  newNum?: number
}

function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const result: DiffLine[] = []
  const maxLen = Math.max(oldLines.length, newLines.length)
  for (let i = 0; i < maxLen; i++) {
    const oldLine = i < oldLines.length ? oldLines[i] : undefined
    const newLine = i < newLines.length ? newLines[i] : undefined
    if (oldLine === undefined) {
      result.push({ type: "added", newLine, newNum: i + 1 })
    } else if (newLine === undefined) {
      result.push({ type: "removed", oldLine, oldNum: i + 1 })
    } else if (oldLine === newLine) {
      result.push({
        type: "same",
        oldLine,
        newLine,
        oldNum: i + 1,
        newNum: i + 1,
      })
    } else {
      result.push({ type: "removed", oldLine, oldNum: i + 1 })
      result.push({ type: "added", newLine, newNum: i + 1 })
    }
  }
  return result
}

export function JsonDiffViewer({
  oldContent,
  newContent,
}: JsonDiffViewerProps) {
  const oldLines = oldContent.split("\n")
  const newLines = newContent.split("\n")
  const diff = computeDiff(oldLines, newLines)

  return (
    <div className="overflow-x-auto rounded-lg border-2 font-mono text-xs leading-relaxed">
      <div className="flex border-b bg-muted text-xs text-muted-foreground">
        <div className="w-1/2 border-r px-3 py-1.5 font-medium">Old</div>
        <div className="w-1/2 px-3 py-1.5 font-medium">New</div>
      </div>
      {diff.map((line, i) => (
        <div
          key={`${line.type}-${line.oldNum ?? ""}-${line.newNum ?? ""}`}
          className="flex"
        >
          <div
            className={`flex w-1/2 border-r ${
              line.type === "removed"
                ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                : line.type === "added"
                  ? ""
                  : ""
            }`}
          >
            <span className="w-8 shrink-0 text-right text-muted-foreground/50">
              {line.oldNum ?? ""}
            </span>
            <span className="flex-1 whitespace-pre px-2">
              {line.type === "added" ? "" : line.oldLine}
            </span>
          </div>
          <div
            className={`flex w-1/2 ${
              line.type === "added"
                ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                : line.type === "removed"
                  ? ""
                  : ""
            }`}
          >
            <span className="w-8 shrink-0 text-right text-muted-foreground/50">
              {line.newNum ?? ""}
            </span>
            <span className="flex-1 whitespace-pre px-2">
              {line.type === "removed" ? "" : line.newLine}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
