import { useMemo, useState } from 'react'
import { Button, Card, EmptyState, ErrorNote, Field, PageTitle, TextArea } from '../components/ui.tsx'
import { useCouple } from '../context/CoupleContext.tsx'
import { IDEA_CATALOG } from '../data/content.ts'
import { categoryKey } from '../i18n/messages.ts'
import { useI18n } from '../i18n/LocaleContext.tsx'
import { formatWhen, fromLocalInput, toLocalInput } from '../lib/format.ts'
import type { ActivityCategory } from '../types.ts'

const FILTERS: { id: 'all' | 'favourites' | ActivityCategory }[] = [
  { id: 'all' },
  { id: 'favourites' },
  { id: 'virtual-date' },
  { id: 'movie' },
  { id: 'game' },
  { id: 'idea' },
]

export function ActivitiesPage() {
  const { couple, uid, partner, createActivity, updateActivity, removeActivity, createChecklistItem, setChecklistItem, removeChecklistItem } = useCouple()
  const { t, err, phrase, locale } = useI18n()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ActivityCategory>('virtual-date')
  const [when, setWhen] = useState('')
  const [check, setCheck] = useState('')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  const activities = useMemo(() => {
    return Object.values(couple.activities)
      .filter((activity) => {
        if (filter === 'all') return true
        if (filter === 'favourites') return activity.favourite
        return activity.category === filter
      })
      .sort((a, b) => Number(a.completed) - Number(b.completed) || b.createdAt - a.createdAt)
  }, [couple.activities, filter])
  const checklist = Object.values(couple.checklist)

  async function addIdea(nextTitle: string, nextDescription: string, nextCategory: ActivityCategory) {
    setError('')
    try {
      await createActivity({ title: nextTitle, description: nextDescription, category: nextCategory, scheduledAt: '' })
      setTitle('')
      setDescription('')
      setWhen('')
      setOpen(false)
    } catch (reason) {
      setError(err(reason))
    }
  }

  function randomIdea() {
    const pool = IDEA_CATALOG.filter((idea) => !Object.values(couple.activities).some((activity) => activity.title === idea.title))
    const idea = (pool.length ? pool : IDEA_CATALOG)[Math.floor(Math.random() * (pool.length ? pool.length : IDEA_CATALOG.length))]
    void addIdea(idea.title, idea.description, idea.category)
  }

  return (
    <div className="grid gap-4">
      <PageTitle title={t('activities.title')} />
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-extrabold">{t('activities.checklist')}</h2>
          <Button variant="ghost" onClick={randomIdea}>{t('activities.surprise')}</Button>
        </div>
        <ul className="grid gap-2">
          {checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                id={`check-${item.id}`}
                type="checkbox"
                checked={item.done}
                onChange={(event) => void setChecklistItem(item.id, event.target.checked).catch((reason) => setError(err(reason)))}
              />
              <label htmlFor={`check-${item.id}`} className={item.done ? 'flex-1 text-sm line-through' : 'flex-1 text-sm'}>{phrase(item.text)}</label>
              <button type="button" className="text-xs font-extrabold" onClick={() => void removeChecklistItem(item.id)}>{t('common.remove')}</button>
            </li>
          ))}
        </ul>
        <form className="mt-3 grid grid-cols-[1fr_auto] gap-2" onSubmit={(event) => { event.preventDefault(); void createChecklistItem(check).then(() => setCheck('')).catch((reason) => setError(err(reason))) }}>
          <Field label={t('activities.addCheck')} name="check" value={check} onChange={(event) => setCheck(event.target.value)} maxLength={80} />
          <Button className="self-end" type="submit">{t('common.add')}</Button>
        </form>
      </Card>

      <div className="chip-row">
        {FILTERS.map((item) => (
          <button key={item.id} type="button" className={filter === item.id ? 'chip chip-on shrink-0' : 'chip shrink-0'} onClick={() => setFilter(item.id)}>{t(categoryKey(item.id))}</button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {activities.map((activity) => (
          <Card key={activity.id} className="p-4">
            <p className="text-xs font-extrabold tracking-wide text-[var(--muted)] uppercase">{t(categoryKey(activity.category))}</p>
            <h3 className="font-display mt-1 text-2xl">{phrase(activity.title)}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{phrase(activity.description)}</p>
            {activity.scheduledAt ? <p className="mt-2 text-xs font-bold">{t('activities.planned', { when: formatWhen(new Date(activity.scheduledAt).getTime(), locale) })}</p> : null}
            <p className="mt-1 text-xs text-[var(--muted)]">{t('activities.addedBy', { name: activity.createdBy === uid ? t('common.you') : partner?.displayName ?? t('common.yourPerson') })}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => void updateActivity(activity.id, { completed: !activity.completed })}>{activity.completed ? t('activities.completed') : t('activities.markDone')}</Button>
              <Button variant="ghost" onClick={() => void updateActivity(activity.id, { favourite: !activity.favourite })}>{activity.favourite ? t('activities.favourited') : t('activities.favourite')}</Button>
              <Button variant="danger" onClick={() => void removeActivity(activity.id)}>{t('common.delete')}</Button>
            </div>
            <Field className="mt-3" label={t('activities.schedule')} name={`when-${activity.id}`} type="datetime-local" value={toLocalInput(activity.scheduledAt)} onChange={(event) => {
              try {
                void updateActivity(activity.id, { scheduledAt: fromLocalInput(event.target.value) })
              } catch (reason) {
                setError(err(reason))
              }
            }} />
          </Card>
        ))}
      </div>
      {!activities.length ? <EmptyState title={t('activities.emptyTitle')} body={t('activities.emptyBody')} /> : null}

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold">{t('activities.addTitle')}</h2>
          <button type="button" className="text-sm font-extrabold" onClick={() => setOpen((value) => !value)}>{open ? t('common.close') : t('activities.new')}</button>
        </div>
        {open ? (
          <form
            className="mt-3 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              void (async () => {
                setError('')
                try {
                  await createActivity({ title, description, category, scheduledAt: fromLocalInput(when) })
                  setTitle('')
                  setDescription('')
                  setWhen('')
                  setOpen(false)
                } catch (reason) {
                  setError(err(reason))
                }
              })()
            }}
          >
            <Field label={t('activities.titleField')} name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} required />
            <TextArea label={t('activities.details')} name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={400} />
            <label className="block text-sm font-extrabold">
              {t('activities.category')}
              <select className="field mt-1.5" value={category} onChange={(event) => setCategory(event.target.value as ActivityCategory)}>
                <option value="virtual-date">{t('cat.virtual-date')}</option>
                <option value="movie">{t('cat.movie')}</option>
                <option value="game">{t('cat.game')}</option>
                <option value="idea">{t('cat.idea')}</option>
              </select>
            </label>
            <Field label={t('activities.optionalTime')} name="when" type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} />
            <Button type="submit">{t('activities.save')}</Button>
          </form>
        ) : null}
      </Card>

      <section>
        <h2 className="mb-2 font-extrabold">{t('activities.suggestions')}</h2>
        <div className="grid gap-2">
          {IDEA_CATALOG.map((idea) => (
            <div key={idea.title} className="surface flex items-center gap-3 px-4 py-3">
              <span className="text-2xl" aria-hidden="true">{idea.emoji}</span>
              <div className="flex-1">
                <p className="font-extrabold">{phrase(idea.title)}</p>
                <p className="text-xs text-[var(--muted)]">{phrase(idea.description)}</p>
              </div>
              <Button variant="soft" onClick={() => void addIdea(idea.title, idea.description, idea.category)}>{t('common.add')}</Button>
            </div>
          ))}
        </div>
      </section>
      <ErrorNote>{error}</ErrorNote>
    </div>
  )
}
