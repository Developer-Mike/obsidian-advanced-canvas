export function extension(path: string): string | undefined {
  return path.includes('.') ? path.split('.').pop() : undefined
}