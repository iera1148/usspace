import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { useI18n } from '../i18n/LocaleContext.tsx'
import { cx, initials } from '../lib/format.ts'

export function Splash({ label, detail }: { label: string; detail?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-xs text-center">
        <div className="heart-loader" aria-hidden="true">♡</div>
        <p className="mt-3 font-extrabold">{label}</p>
        {detail ? <p className="mt-2 text-sm text-[var(--muted)]">{detail}</p> : null}
      </div>
    </div>
  )
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'soft' | 'ghost' | 'danger' }) {
  return <button type={type} className={cx('btn', `btn-${variant}`, className)} {...props} />
}

export function Field({
  label,
  hint,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const inputId = id ?? props.name
  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-1.5 block text-sm font-extrabold">{label}</span>
      <input id={inputId} className="field" aria-invalid={error ? true : undefined} {...props} />
      {error ? <span className="mt-1 block text-sm font-bold text-[var(--danger)]">{error}</span> : null}
      {hint && !error ? <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span> : null}
    </label>
  )
}

export function TextArea({
  label,
  error,
  id,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
  const inputId = id ?? props.name
  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-1.5 block text-sm font-extrabold">{label}</span>
      <textarea id={inputId} className="field min-h-28 resize-y" aria-invalid={error ? true : undefined} {...props} />
      {error ? <span className="mt-1 block text-sm font-bold text-[var(--danger)]">{error}</span> : null}
    </label>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx('surface', className)}>{children}</section>
}

export function PageTitle({ kicker, title, subtitle }: { kicker?: string; title: string; subtitle?: string }) {
  return (
    <header className="page-head">
      {kicker ? <p className="text-xs font-extrabold tracking-[0.16em] text-[var(--muted)] uppercase">{kicker}</p> : null}
      <h1 className="font-display text-[1.85rem] leading-[1.12] tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{subtitle}</p> : null}
    </header>
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="surface px-5 py-8 text-center">
      <p className="font-display text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-xs text-sm text-[var(--muted)]">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Avatar({ name, photoURL, online }: { name: string; photoURL?: string; online?: boolean }) {
  return (
    <div className="relative">
      {photoURL ? (
        <img src={photoURL} alt="" className="h-16 w-16 rounded-full object-cover" />
      ) : (
        <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--soft)] font-display text-xl" aria-hidden="true">
          {initials(name)}
        </div>
      )}
      {online !== undefined ? (
        <span className={cx('online-dot', online && 'online-dot-on')} title={online ? 'Online' : 'Offline'} />
      ) : null}
    </div>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const { t } = useI18n()
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, open])

  if (!open) return null
  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl">{title}</h2>
          <button type="button" className="btn btn-ghost !px-3" onClick={onClose} aria-label={t('common.close')}>
            {t('common.close')}
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="text-sm font-bold text-[var(--danger)]">{children}</p>
}
