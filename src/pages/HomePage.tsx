import { useEffect, useMemo, useRef, useState } from 'react'
import { HeartBurst } from '../components/fx.tsx'
import { Avatar, Button, Card, ErrorNote, Field, PageTitle } from '../components/ui.tsx'
import { useCouple } from '../context/CoupleContext.tsx'
import { useToast } from '../context/ToastContext.tsx'
import { useI18n } from '../i18n/LocaleContext.tsx'
import { countdown, daysSince, formatClock, formatInvite, formatLongDate, formatWhen, fromLocalInput, toLocalInput } from '../lib/format.ts'

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export function HomePage() {
  const { couple, uid, me, partner, partnerId, setMyStatus, sendNote, updateSettings } = useCouple()
  const { t, err, phrase, ago, locale } = useI18n()
  const toast = useToast()
  const now = useNow()
  const [note, setNote] = useState('')
  const [meeting, setMeeting] = useState(toLocalInput(couple.settings.nextMeetingDate))
  const [start, setStart] = useState(couple.settings.relationshipStartDate)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [hearts, setHearts] = useState(false)
  const seenStatus = useRef<number | null>(null)

  useEffect(() => {
    setMeeting(toLocalInput(couple.settings.nextMeetingDate))
    setStart(couple.settings.relationshipStartDate)
  }, [couple.settings.nextMeetingDate, couple.settings.relationshipStartDate])

  const partnerStatus = partnerId ? couple.statuses[partnerId] : undefined
  useEffect(() => {
    const stamp = partnerStatus?.updatedAt ?? null
    if (seenStatus.current === null) {
      seenStatus.current = stamp
      return
    }
    if (stamp && stamp !== seenStatus.current) {
      seenStatus.current = stamp
      setHearts(true)
      const timer = window.setTimeout(() => setHearts(false), 1400)
      return () => window.clearTimeout(timer)
    }
  }, [partnerStatus?.updatedAt])

  const days = daysSince(couple.settings.relationshipStartDate, now)
  const left = countdown(couple.settings.nextMeetingDate, now.getTime())
  const notes = useMemo(
    () => Object.values(couple.loveNotes).sort((a, b) => b.createdAt - a.createdAt).slice(0, 4),
    [couple.loveNotes],
  )
  const myStatus = couple.statuses[uid]
  const partnerPresence = partnerId ? couple.presence[partnerId] : undefined

  async function saveDates() {
    setError('')
    try {
      if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error('Choose a real start date.')
      await updateSettings({ relationshipStartDate: start, nextMeetingDate: fromLocalInput(meeting) })
      setEditing(false)
      toast(t('home.saved'))
    } catch (reason) {
      setError(err(reason))
    }
  }

  async function publishNote() {
    setError('')
    try {
      await sendNote(note)
      setNote('')
      setHearts(true)
      window.setTimeout(() => setHearts(false), 1400)
    } catch (reason) {
      setError(err(reason))
    }
  }

  return (
    <div className="relative grid gap-4">
      <HeartBurst show={hearts} />
      <PageTitle kicker={`${formatLongDate(now, locale)} · ${formatClock(now, locale)}`} title={t('home.greeting')} />
      <Card className="p-4">
        <div className="pair">
        <Person name={me.displayName} photoURL={me.photoURL} online={Boolean(couple.presence[uid]?.online)} caption={t('common.you')} />
        {partner && partnerId ? (
          <Person
            name={partner.displayName}
            photoURL={partner.photoURL}
            online={Boolean(partnerPresence?.online)}
            caption={partnerPresence?.online ? t('home.online') : ago(partnerPresence?.lastSeen ?? 0, now.getTime())}
          />
        ) : (
          <div>
            <p className="font-extrabold">{t('home.waitingTitle')}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{t('home.waitingBody')}</p>
            <p className="invite-code">{formatInvite(couple.inviteCode)}</p>
          </div>
        )}
        </div>
      </Card>

      <Card className="overflow-hidden p-5">
        <p className="text-sm font-extrabold text-[var(--muted)]">{t('home.counter')}</p>
        {days === null ? (
          <p className="font-display mt-1 text-3xl">{t('home.setDay')}</p>
        ) : days < 0 ? (
          <p className="font-display mt-1 text-3xl">{t('home.future')}</p>
        ) : (
          <p className="font-display mt-1 text-4xl">{days === 1 ? t('home.togetherOne') : t('home.together', { count: days })}</p>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-extrabold text-[var(--muted)]">{t('home.next')}</p>
          <button type="button" className="text-sm font-extrabold" onClick={() => setEditing((value) => !value)}>
            {editing ? t('common.close') : t('home.changeDates')}
          </button>
        </div>
        {left ? (
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <Count value={left.days} label={t('home.days')} />
            <Count value={left.hours} label={t('home.hrs')} />
            <Count value={left.minutes} label={t('home.min')} />
            <Count value={left.seconds} label={t('home.sec')} />
          </div>
        ) : (
          <p className="font-display mt-2 text-3xl">{couple.settings.nextMeetingDate ? t('home.arrived') : t('home.pickDay')}</p>
        )}
        {editing ? (
          <div className="mt-4 grid gap-3">
            <Field label={t('home.started')} name="start" type="date" value={start} onChange={(event) => setStart(event.target.value)} />
            <Field label={t('home.next')} name="meeting" type="datetime-local" value={meeting} onChange={(event) => setMeeting(event.target.value)} />
            <Button onClick={() => void saveDates()}>{t('home.saveBoth')}</Button>
          </div>
        ) : null}
      </Card>

      <Card className="p-5">
        <p className="text-sm font-extrabold text-[var(--muted)]">{t('home.feel')}</p>
        <p className="mt-1 font-extrabold">{t('common.you')} · {myStatus ? `${myStatus.emoji} ${phrase(myStatus.label)}` : t('home.noStatus')}</p>
        <p className="font-extrabold">
          {partner ? partner.displayName : t('common.yourPerson')} · {partnerStatus ? `${partnerStatus.emoji} ${phrase(partnerStatus.label)}` : t('home.waitingStatus')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {couple.settings.statusOptions.map((status) => (
            <button
              key={status.id}
              type="button"
              className={myStatus?.label === status.label ? 'chip chip-on' : 'chip'}
              onClick={() => void setMyStatus(status.emoji, status.label).catch((reason) => setError(err(reason)))}
            >
              {status.emoji} {phrase(status.label)}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-extrabold text-[var(--muted)]">{t('home.notes')}</p>
        {notes.length ? (
          <ul className="mt-3 space-y-3">
            {notes.map((item) => (
              <li key={item.id}>
                <p className="font-bold">{item.text}</p>
                <p className="text-xs text-[var(--muted)]">
                  {item.authorId === uid ? t('common.you') : partner?.displayName ?? t('common.yourPerson')} · {formatWhen(item.createdAt, locale)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted)]">{t('home.noteEmpty')}</p>
        )}
        <div className="mt-4 grid gap-2">
          <Field label={t('home.noteLabel')} name="note" value={note} maxLength={180} onChange={(event) => setNote(event.target.value)} placeholder={t('home.notePlaceholder')} />
          <Button onClick={() => void publishNote()}>{t('home.leaveNote')}</Button>
        </div>
      </Card>
      <ErrorNote>{error}</ErrorNote>
    </div>
  )
}

function Person({ name, photoURL, online, caption }: { name: string; photoURL?: string; online?: boolean; caption: string }) {
  return (
    <div className="person">
      <Avatar name={name} photoURL={photoURL} online={online} />
      <div className="min-w-0">
        <p className="person-name">{name}</p>
        <p className="text-xs text-[var(--muted)]">{caption}</p>
      </div>
    </div>
  )
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-[var(--soft)] px-2 py-3">
      <p className="font-display text-2xl">{value}</p>
      <p className="text-xs font-extrabold text-[var(--muted)]">{label}</p>
    </div>
  )
}
