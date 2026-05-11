let objectIdCounter = Math.floor(Math.random() * 0xffffff)

function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, "0")
  const random = Array.from({ length: 5 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0"),
  ).join("")
  const counter = (objectIdCounter++ % 0xffffff).toString(16).padStart(6, "0")
  return timestamp + random + counter
}

export class ObjectId {
  private hex: string

  constructor(id?: string) {
    if (id) {
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        throw new Error(
          `Invalid ObjectId: "${id}" must be a 24-char hex string`,
        )
      }
      this.hex = id.toLowerCase()
    } else {
      this.hex = generateObjectId()
    }
  }

  toString(): string {
    return this.hex
  }

  toHexString(): string {
    return this.hex
  }

  toJSON(): string {
    return this.hex
  }

  equals(other: ObjectId): boolean {
    return this.hex === other.hex
  }

  static isValid(hex: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(hex)
  }
}
