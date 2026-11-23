import { cx } from '../lib/format.ts'
import { useI18n } from '../i18n/LocaleContext.tsx'

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage, t } = useI18n()
  return (
    <div className={cx('lang-switch', className)} role="group" aria-label={t('lang.group')}>
      <button type="button" className={language === 'en' ? 'chip chip-on' : 'chip'} aria-pressed={language === 'en'} onClick={() => void setLanguage('en')}>
        ENG
      </button>
      <button type="button" className={language === 'ms' ? 'chip chip-on' : 'chip'} aria-pressed={language === 'ms'} onClick={() => void setLanguage('ms')}>
        BM
      </button>
    </div>
  )
}
