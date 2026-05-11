import type { MongoBody, MongojsonAuth } from "./types"
import { MongojsonServerError, MongojsonBulkWriteError } from "./errors"

function statusToMongoMsg(status: number, fallback: string): string {
  switch (status) {
    case 401:
      return "bad auth Authentication failed."
    case 403:
      return "not authorized for query"
    case 404:
      return "ns not found"
    case 409:
      return "E11000 duplicate key error"
    case 422:
      return `bad value ${fallback}`
    default:
      return fallback
  }
}

export async function mongoRequest(
  baseUrl: string,
  endpoint: string,
  body: MongoBody,
  auth: MongojsonAuth,
): Promise<unknown> {
  const url = `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Basic ${btoa(`${auth.username}:${auth.password}`)}`,
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const resBody = await res.json().catch(() => null)
    const errBody = (resBody ?? {}) as {
      error?: string
      code?: number
      writeErrors?: { index: number; errmsg: string }[]
    }

    const message = errBody.error ?? res.statusText

    if (res.status === 409 && errBody.writeErrors) {
      throw new MongojsonBulkWriteError(res.status, message, errBody.writeErrors)
    }

    const mongoMsg = statusToMongoMsg(res.status, message)
    throw new MongojsonServerError(res.status, mongoMsg, errBody.code)
  }

  return res.json()
}
