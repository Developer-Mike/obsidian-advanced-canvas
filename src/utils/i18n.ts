import { getLanguage } from "obsidian"

export type Language = "en"
export type TranslateableResource = {
  en: string
  [key: string]: string
}

const FALLBACKS: Partial<Record<string, Language>> = {
  "en-GB": "en",
  // "pt-BR": "pt",
  // "zh-TW": "zh",
}

export default function t(resource: TranslateableResource) {
  let lang = getLanguage()

  if (!(lang in resource)) {
    console.warn(`Language ${lang} not found in resource, falling back to ${FALLBACKS[lang] ?? "en"}`)
    lang = FALLBACKS[lang] ?? lang
  }

  return resource[lang] ?? resource.en
}

export const strings = {

}
