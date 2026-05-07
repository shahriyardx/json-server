export type QueryParams = {
  search?: string
  filter?: Record<string, string>
  sort?: string
  order?: "asc" | "desc"
  limit?: number
  start?: number
  end?: number
  skip?: number
  [key: string]: string | number | Record<string, string> | undefined
}

export type ClientOptions = {
  baseUrl: string
  apiKey?: string
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

function buildUrl(baseUrl: string, path: string, params?: QueryParams, apiKey?: string): string {
  const base = path.startsWith("http") ? path : `${baseUrl}/${path}`
  const url = new URL(base)
  const searchParams: Record<string, string> = {}

  if (apiKey) searchParams.api_key = apiKey

  if (params) {
    if (params.search) searchParams.search = params.search
    if (params.sort) searchParams.sort = params.sort
    if (params.order) searchParams.order = params.order
    if (params.limit !== undefined) searchParams._limit = String(params.limit)
    if (params.start !== undefined) searchParams._start = String(params.start)
    if (params.end !== undefined) searchParams._end = String(params.end)
    if (params.skip !== undefined) searchParams._skip = String(params.skip)

    if (params.filter) {
      for (const [key, val] of Object.entries(params.filter)) {
        searchParams.filter = `${key}:${val}`
      }
    }

    for (const [key, val] of Object.entries(params)) {
      if (!["search", "filter", "sort", "order", "limit", "start", "end", "skip", "api_key"].includes(key)) {
        searchParams[key] = String(val)
      }
    }
  }

  for (const [key, val] of Object.entries(searchParams)) {
    url.searchParams.set(key, val)
  }

  return url.toString()
}

export class JsonSDK {
  private baseUrl: string
  private apiKey?: string

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "")
    this.apiKey = options.apiKey
  }

  private async request<T>(
    path: string,
    init: RequestInit & { params?: QueryParams } = {},
  ): Promise<T> {
    const url = buildUrl(this.baseUrl, path, init.params, this.apiKey)

    const headers: Record<string, string> = {}
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    if (init.body) headers["Content-Type"] = "application/json"

    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers,
      body: init.body,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new ApiError(res.status, (body as { error?: string }).error ?? res.statusText)
    }

    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  get<T = unknown>(path: string, params?: QueryParams): Promise<T> {
    return this.request<T>(path, { params })
  }

  post<T = unknown, B = Record<string, unknown>>(path: string, body: B): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  }

  patch<T = unknown, B = Record<string, unknown>>(path: string, body: B, params?: QueryParams): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      params,
    })
  }

  del<T = unknown>(path: string, params?: QueryParams): Promise<T> {
    return this.request<T>(path, { method: "DELETE", params })
  }
}
