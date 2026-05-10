import { applyMongoFilter } from "./mongo-filter"

export function applyMongoUpdate(
  target: Record<string, unknown>,
  update: Record<string, unknown>,
): void {
  if ("$set" in update) {
    const setFields = update.$set as Record<string, unknown>
    for (const [key, val] of Object.entries(setFields)) {
      if (key.includes(".")) {
        setNested(target, key, val)
      } else {
        target[key] = val
      }
    }
  }

  if ("$unset" in update) {
    const unsetFields = update.$unset as Record<string, unknown>
    for (const key of Object.keys(unsetFields)) {
      if (key.includes(".")) {
        unsetNested(target, key)
      } else {
        delete target[key]
      }
    }
  }

  if ("$inc" in update) {
    const incFields = update.$inc as Record<string, number>
    for (const [key, val] of Object.entries(incFields)) {
      if (key.includes(".")) {
        const current = getNested(target, key)
        setNested(target, key, (typeof current === "number" ? current : 0) + val)
      } else {
        target[key] = ((target[key] as number) || 0) + val
      }
    }
  }

  if ("$mul" in update) {
    const mulFields = update.$mul as Record<string, number>
    for (const [key, val] of Object.entries(mulFields)) {
      if (key.includes(".")) {
        const current = getNested(target, key)
        setNested(target, key, (typeof current === "number" ? current : 0) * val)
      } else {
        target[key] = ((target[key] as number) || 0) * val
      }
    }
  }

  if ("$min" in update) {
    const minFields = update.$min as Record<string, number>
    for (const [key, val] of Object.entries(minFields)) {
      if (key.includes(".")) {
        const current = getNested(target, key)
        if (current === undefined || (typeof current === "number" && val < current)) {
          setNested(target, key, val)
        }
      } else {
        if (target[key] === undefined || (typeof target[key] === "number" && val < (target[key] as number))) {
          target[key] = val
        }
      }
    }
  }

  if ("$max" in update) {
    const maxFields = update.$max as Record<string, number>
    for (const [key, val] of Object.entries(maxFields)) {
      if (key.includes(".")) {
        const current = getNested(target, key)
        if (current === undefined || (typeof current === "number" && val > current)) {
          setNested(target, key, val)
        }
      } else {
        if (target[key] === undefined || (typeof target[key] === "number" && val > (target[key] as number))) {
          target[key] = val
        }
      }
    }
  }

  if ("$rename" in update) {
    const renameFields = update.$rename as Record<string, string>
    for (const [oldName, newName] of Object.entries(renameFields)) {
      if (oldName in target) {
        target[newName] = target[oldName]
        delete target[oldName]
      }
    }
  }

  if ("$currentDate" in update) {
    const dateFields = update.$currentDate as Record<string, unknown>
    const now = new Date().toISOString()
    for (const key of Object.keys(dateFields)) {
      target[key] = now
    }
  }

  if ("$push" in update) {
    const pushFields = update.$push as Record<string, unknown>
    for (const [key, val] of Object.entries(pushFields)) {
      if (!Array.isArray(target[key])) target[key] = []
      const arr = target[key] as unknown[]

      if (typeof val === "object" && val !== null && "$each" in (val as Record<string, unknown>)) {
        const pushSpec = val as Record<string, unknown>
        const items = pushSpec.$each as unknown[]
        if (!Array.isArray(items)) continue

        for (const item of items) {
          arr.push(item)
        }

        if ("$sort" in pushSpec) {
          const sortDir = pushSpec.$sort as number
          if (arr.every((e) => typeof e === "number")) {
            arr.sort((a, b) => (sortDir === -1 ? (b as number) - (a as number) : (a as number) - (b as number)))
          }
        }

        if ("$slice" in pushSpec) {
          const sliceCount = pushSpec.$slice as number
          if (sliceCount >= 0) {
            target[key] = arr.slice(0, sliceCount)
          } else {
            target[key] = arr.slice(sliceCount)
          }
        }
      } else {
        arr.push(val)
      }
    }
  }

  if ("$addToSet" in update) {
    const addToSetFields = update.$addToSet as Record<string, unknown>
    for (const [key, val] of Object.entries(addToSetFields)) {
      if (!Array.isArray(target[key])) target[key] = []
      const arr = target[key] as unknown[]

      if (Array.isArray(val)) {
        for (const item of val) {
          if (!arr.includes(item)) arr.push(item)
        }
      } else {
        if (!arr.includes(val)) arr.push(val)
      }
    }
  }

  if ("$pull" in update) {
    const pullFields = update.$pull as Record<string, unknown>
    for (const [key, val] of Object.entries(pullFields)) {
      if (!Array.isArray(target[key])) continue
      const arr = target[key] as unknown[]

      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        const filterObj = val as Record<string, unknown>
        const filtered = applyMongoFilter(arr, filterObj)
        const removed = new Set(filtered)
        target[key] = arr.filter((item) => !removed.has(item))
      } else {
        target[key] = arr.filter((item) => item !== val)
      }
    }
  }
}

function setNested(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".")
  let current = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof current[parts[i]] !== "object" || current[parts[i]] === null) {
      current[parts[i]] = {}
    }
    current = current[parts[i]] as Record<string, unknown>
  }
  current[parts[parts.length - 1]] = value
}

function getNested(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".")
  let current: unknown = obj
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function unsetNested(obj: Record<string, unknown>, path: string): void {
  const parts = path.split(".")
  let current = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof current[parts[i]] !== "object" || current[parts[i]] === null) return
    current = current[parts[i]] as Record<string, unknown>
  }
  delete current[parts[parts.length - 1]]
}
