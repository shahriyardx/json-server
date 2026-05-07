import { NextResponse } from "next/server"

export const corsHeaders = { "Access-Control-Allow-Origin": "*" }

export function json(
  data: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
) {
  return NextResponse.json(data, {
    status,
    headers: { ...corsHeaders, ...extraHeaders },
  })
}

export function ok(data: unknown, status = 200) {
  return json({ success: true, data }, status)
}

export function fail(error: string, status: number) {
  return json({ success: false, error }, status)
}

export function cacheHeaders(etag: string, updatedAt: Date) {
  return {
    ETag: `"${etag}"`,
    "Last-Modified": updatedAt.toUTCString(),
    "Cache-Control": "no-cache",
  }
}
