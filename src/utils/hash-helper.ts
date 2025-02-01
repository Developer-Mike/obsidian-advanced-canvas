import crypto from 'crypto'

export default class HashHelper {
  static hash(str: string): string {
    return crypto.createHash('sha256')
      .update(str)
      .digest('hex')
  }
}