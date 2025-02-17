export default class TextHelper {
  static toCamelCase(str: string): string {
    return str.replace(/-./g, (x: string) => x[1].toUpperCase())
  }
}