export default class TextHelper {
  static toCamelCase(str: string): string {
    return str.replace(/-./g, (x: string) => x[1].toUpperCase())
  }

  static toTitleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
}