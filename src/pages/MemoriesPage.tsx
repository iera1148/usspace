import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Button, EmptyState, ErrorNote, Field, Modal, PageTitle, TextArea } from '../components/ui.tsx'
import { useCouple } from '../context/CoupleContext.tsx'
import { MEMORY_LABELS } from '../data/content.ts'
import { useI18n } from '../i18n/LocaleContext.tsx'
import { compressImage } from '../lib/image.ts'
import { assertImageReference, formatDay } from '../lib/format.ts'
import type { Memory, MemoryInput } from '../types.ts'

const blank = (): MemoryInput => ({
  title: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  imageUrl: '',
  label: 'Just Because',
  favourite: false,
})

export function MemoriesPage() {
  const { couple, uid, partner, createMemory, updateMemory, removeMemory } = useCouple()
  const { t, err, phrase, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Memory | null>(null)
  const [draft, setDraft] = useState<MemoryInput>(blank())
  const [favouritesOnly, setFavouritesOnly] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)

  const memories = useMemo(() => {
    return Object.values(couple.memories)
      .filter((memory) => (favouritesOnly ? memory.favourite : true))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  }, [couple.memories, favouritesOnly])

  function startCreate() {
    setEditing(null)
    setDraft(blank())
    setError('')
    setOpen(true)
  }

  function startEdit(memory: Memory) {
    setEditing(memory)
    setDraft({
      title: memory.title,
      description: memory.description,
      date: memory.date,
      imageUrl: memory.imageUrl,
      label: memory.label,
      favourite: memory.favourite,
    })
    setError('')
    setOpen(true)
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setError('')
    try {
      const imageUrl = await compressImage(file)
      setDraft((current) => ({ ...current, imageUrl }))
    } catch (reason) {
      setError(err(reason))
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const input = { ...draft, imageUrl: assertImageReference(draft.imageUrl) }
      if (editing) await updateMemory(editing.id, input)
      else await createMemory(input)
      setOpen(false)
    } catch (reason) {
      setError(err(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4">
      <PageTitle title={t('memories.title')} />
      <div className="flex gap-2">
        <Button onClick={startCreate}>{t('memories.add')}</Button>
        <Button variant={favouritesOnly ? 'primary' : 'ghost'} onClick={() => setFavouritesOnly((value) => !value)}>{t('memories.favourites')}</Button>
      </div>
      {memories.length ? (
        <ol className="timeline">
          {memories.map((memory) => (
            <li key={memory.id} className="surface overflow-hidden">
              {memory.imageUrl ? <img src={memory.imageUrl} alt="" className="max-h-64 w-full object-cover" /> : null}
              <div className="p-4">
                <p className="text-xs font-extrabold tracking-wide text-[var(--muted)] uppercase">{phrase(memory.label)}</p>
                <h2 className="font-display text-2xl">{memory.title}</h2>
                <p className="text-sm text-[var(--muted)]">{formatDay(memory.date, locale)} · {memory.createdBy === uid ? t('common.you') : partner?.displayName ?? t('common.yourPerson')}</p>
                {memory.description ? <p className="mt-2 text-sm">{memory.description}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => void updateMemory(memory.id, { ...memory, favourite: !memory.favourite })}>{memory.favourite ? t('activities.favourited') : t('activities.favourite')}</Button>
                  <Button variant="ghost" onClick={() => startEdit(memory)}>{t('common.edit')}</Button>
                  <Button variant="danger" onClick={() => void removeMemory(memory.id).catch((reason) => setError(err(reason)))}>{t('common.delete')}</Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title={t('memories.emptyTitle')} body={t('memories.emptyBody')} action={<Button onClick={startCreate}>{t('memories.first')}</Button>} />
      )}
      <ErrorNote>{error}</ErrorNote>
      <Modal open={open} title={editing ? t('memories.edit') : t('memories.new')} onClose={() => setOpen(false)}>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <Field label={t('memories.titleField')} name="title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={80} required />
          <TextArea label={t('memories.what')} name="description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} maxLength={1000} />
          <Field label={t('memories.date')} name="date" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} required />
          <label className="block text-sm font-extrabold">
            {t('memories.label')}
            <select className="field mt-1.5" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })}>
              {MEMORY_LABELS.map((label) => <option key={label} value={label}>{phrase(label)}</option>)}
            </select>
          </label>
          <div className="grid gap-2">
            <p className="text-sm font-extrabold">{t('memories.image')}</p>
            {draft.imageUrl ? <img src={draft.imageUrl} alt="" className="max-h-48 w-full rounded-2xl object-cover" /> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="soft" onClick={() => photoInput.current?.click()}>{t('memories.upload')}</Button>
              {draft.imageUrl ? <Button type="button" variant="ghost" onClick={() => setDraft({ ...draft, imageUrl: '' })}>{t('memories.removePhoto')}</Button> : null}
            </div>
            <input
              ref={photoInput}
              className="file-input"
              type="file"
              accept="image/*"
              aria-label={t('memories.upload')}
              onChange={(event) => {
                void onFile(event.target.files?.[0])
                event.target.value = ''
              }}
            />
            <p className="text-xs text-[var(--muted)]">{draft.imageUrl ? t('memories.attached') : t('memories.imageHint')}</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={draft.favourite} onChange={(event) => setDraft({ ...draft, favourite: event.target.checked })} />
            {t('memories.favourite')}
          </label>
          <ErrorNote>{error}</ErrorNote>
          <Button type="submit" disabled={busy}>{busy ? t('common.saving') : t('memories.save')}</Button>
        </form>
      </Modal>
    </div>
  )
}
