export class MongojsonServerError extends Error {
  readonly code: number
  readonly status: number
  readonly errmsg: string
  readonly codeName: string

  private static statusMeta(status: number): {
    code: number
    codeName: string
  } {
    switch (status) {
      case 401:
        return { code: 8000, codeName: "MongojsonError" }
      case 403:
        return { code: 13, codeName: "Unauthorized" }
      case 404:
        return { code: 26, codeName: "NamespaceNotFound" }
      case 409:
        return { code: 11000, codeName: "DuplicateKey" }
      case 422:
        return { code: 2, codeName: "BadValue" }
      default:
        return { code: 0, codeName: "UnknownError" }
    }
  }

  constructor(status: number, message: string, code?: number) {
    const meta = MongojsonServerError.statusMeta(status)
    const finalCode = code ?? meta.code
    const fullMsg = `MongojsonServerError: ${message}`
    super(fullMsg)
    this.name = "MongojsonServerError"
    this.status = status
    this.code = finalCode
    this.codeName = meta.codeName
    this.errmsg = message
  }
}

export class MongojsonBulkWriteError extends Error {
  readonly code: number
  readonly status: number
  readonly errmsg: string
  readonly writeErrors: { index: number; errmsg: string }[]

  constructor(
    status: number,
    message: string,
    writeErrors: { index: number; errmsg: string }[] = [],
  ) {
    const fullMsg = `MongojsonBulkWriteError: ${message}`
    super(fullMsg)
    this.name = "MongojsonBulkWriteError"
    this.status = status
    this.code = 11000
    this.errmsg = message
    this.writeErrors = writeErrors
  }
}
