export type Lang = 'en' | 'ms'

export const LANG_KEY = 'usspace.lang'

export function storedLanguage(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === 'ms' ? 'ms' : 'en'
  } catch {
    return 'en'
  }
}

export function intlTag(language: Lang) {
  return language === 'ms' ? 'ms-MY' : 'en-MY'
}
