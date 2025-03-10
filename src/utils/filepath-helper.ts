export default class FilepathHelper {
  static extension(path: string): string | undefined {
    return path.includes('.') ? path.split('.').pop() : undefined
  }
}