import { useEffect, useRef, useState } from 'react'
import { useCouple } from '../context/CoupleContext.tsx'
import { useToast } from '../context/ToastContext.tsx'
import { useI18n } from '../i18n/LocaleContext.tsx'

export function PartnerNotices() {
  const { couple, uid, partner, partnerId } = useCouple()
  const { t, phrase } = useI18n()
  const toast = useToast()
  const seen = useRef<Seen | null>(null)
  const [permission, setPermission] = useState(() => (typeof Notification === 'undefined' ? 'denied' : Notification.permission))

  useEffect(() => {
    const notes = Object.values(couple.loveNotes)
    const memories = Object.values(couple.memories)
    const status = partnerId ? couple.statuses[partnerId] : undefined
    const photo = partner?.photoURL ?? ''
    const name = partner?.displayName || t('common.yourPerson')
    if (!seen.current) {
      seen.current = {
        notes: new Set(notes.map((note) => note.id)),
        photos: new Map(memories.map((memory) => [memory.id, memory.imageUrl])),
        statusAt: status?.updatedAt ?? 0,
        photo,
      }
      return
    }
    const previous = seen.current
    notes.forEach((note) => {
      if (previous.notes.has(note.id) || note.authorId === uid) return
      ping(t('notify.note', { name }), note.text)
    })
    memories.forEach((memory) => {
      const before = previous.photos.get(memory.id) ?? ''
      if (memory.createdBy === uid || !memory.imageUrl || memory.imageUrl === before) return
      ping(t('notify.photo', { name }), memory.title)
    })
    if (photo && photo !== previous.photo) ping(t('notify.photo', { name }), name)
    if (status && status.updatedAt !== previous.statusAt) {
      ping(t('notify.status', { name, status: `${status.emoji} ${phrase(status.label)}` }), '')
    }
    seen.current = {
      notes: new Set(notes.map((note) => note.id)),
      photos: new Map(memories.map((memory) => [memory.id, memory.imageUrl])),
      statusAt: status?.updatedAt ?? previous.statusAt,
      photo,
    }

    function ping(title: string, body: string) {
      toast(body ? `${title}. ${body}` : title)
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
      try {
        new Notification(title, { body, icon: `${import.meta.env.BASE_URL}icons/icon-192.png` })
      } catch {
        /* the in-app toast still shows */
      }
    }
  }, [couple.loveNotes, couple.memories, couple.statuses, partner, partnerId, phrase, t, toast, uid])

  if (permission !== 'default') return null
  return (
    <button
      type="button"
      className="banner alert-banner"
      onClick={() => {
        if (typeof Notification === 'undefined') return
        void Notification.requestPermission().then((next) => setPermission(next))
      }}
    >
      {t('notify.enable')}
    </button>
  )
}

interface Seen {
  notes: Set<string>
  photos: Map<string, string>
  statusAt: number
  photo: string
}
