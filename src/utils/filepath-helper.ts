export default class FilepathHelper {
  static extension(path: string | undefined): string | undefined {
    return path?.includes('.') ? path?.split('.')?.pop() : undefined
  }
}