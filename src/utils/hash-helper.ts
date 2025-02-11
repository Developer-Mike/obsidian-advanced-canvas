import { Plugin, TFile } from 'obsidian'

export default class HashHelper {
  static async getFileHash(plugin: Plugin, file: TFile): Promise<string> {
    const bytes = await plugin.app.vault.readBinary(file)
    const cryptoBytes = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))
    return HashHelper.arrayBufferToHexString(cryptoBytes)
  }
  
  static arrayBufferToHexString(buffer: ArrayBuffer): string {
    const uint8Array = new Uint8Array(buffer)
    const hexArray = []
  
    for (const byte of uint8Array) {
      hexArray.push((byte >>> 4).toString(16))
      hexArray.push((byte & 0x0F).toString(16))
    }
  
    return hexArray.join('')
  }
}