export class MongodxServerError extends Error {
  readonly code: number
  readonly status: number
  readonly errmsg: string
  readonly codeName: string

  private static statusMeta(status: number): { code: number; codeName: string } {
    switch (status) {
      case 401: return { code: 8000, codeName: "MongodxError" }
      case 403: return { code: 13, codeName: "Unauthorized" }
      case 404: return { code: 26, codeName: "NamespaceNotFound" }
      case 409: return { code: 11000, codeName: "DuplicateKey" }
      case 422: return { code: 2, codeName: "BadValue" }
      default: return { code: 0, codeName: "UnknownError" }
    }
  }

  constructor(status: number, message: string, code?: number) {
    const meta = MongodxServerError.statusMeta(status)
    const finalCode = code ?? meta.code
    const fullMsg = `MongodxServerError: ${message}`
    super(fullMsg)
    this.name = "MongodxServerError"
    this.status = status
    this.code = finalCode
    this.codeName = meta.codeName
    this.errmsg = message
  }
}

export class MongodxBulkWriteError extends Error {
  readonly code: number
  readonly status: number
  readonly errmsg: string
  readonly writeErrors: { index: number; errmsg: string }[]

  constructor(
    status: number,
    message: string,
    writeErrors: { index: number; errmsg: string }[] = [],
  ) {
    const fullMsg = `MongodxBulkWriteError: ${message}`
    super(fullMsg)
    this.name = "MongodxBulkWriteError"
    this.status = status
    this.code = 11000
    this.errmsg = message
    this.writeErrors = writeErrors
  }
}
