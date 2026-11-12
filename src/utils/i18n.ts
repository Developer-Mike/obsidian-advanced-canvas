import { getLanguage } from "obsidian"

export type Language = "en" | "zh"
export type TranslateableResource =
  { [key in Language]: string } &
  { [key: string]: string }

const FALLBACKS: Partial<Record<string, Language>> = {
  "en-GB": "en",
  // "pt-BR": "pt",
  "zh-CN": "zh",
  "zh-cn": "zh",
  "zh-Hans": "zh",
  "zh-TW": "zh",
}

export default function t(resource: TranslateableResource) {
  let lang = getLanguage()
  if (!(lang in resource)) lang = FALLBACKS[lang] ?? lang

  return resource[lang] ?? resource.en
}

export const strings = {

}
