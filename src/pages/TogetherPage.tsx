import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Confetti, HeartBurst } from '../components/fx.tsx'
import { Button, Card, EmptyState, ErrorNote, Field, PageTitle } from '../components/ui.tsx'
import { useCouple } from '../context/CoupleContext.tsx'
import { useToast } from '../context/ToastContext.tsx'
import { COIN_PRESETS, DECK, DECK_CATEGORIES } from '../data/content.ts'
import { categoryKey } from '../i18n/messages.ts'
import { useI18n } from '../i18n/LocaleContext.tsx'
import { formatWhen } from '../lib/format.ts'
import type { DeckCategory, DeckItem, MatchEntry } from '../types.ts'

const WHEEL_COLORS = ['#FFD6E7', '#DCD6FF', '#D6EEFF', '#FFDCC8', '#FDE7A2', '#D8F3DC', '#FFC2D4']

export function TogetherPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<'cards' | 'wheel' | 'coin'>('cards')
  return (
    <div>
      <PageTitle title={t('together.title')} />
      <div className="segment mb-4" role="tablist" aria-label={t('together.tabs')}>
        <TabButton selected={tab === 'cards'} onClick={() => setTab('cards')}>{t('together.cards')}</TabButton>
        <TabButton selected={tab === 'wheel'} onClick={() => setTab('wheel')}>{t('together.spin')}</TabButton>
        <TabButton selected={tab === 'coin'} onClick={() => setTab('coin')}>{t('together.coin')}</TabButton>
      </div>
      {tab === 'cards' ? <ThisOrThat /> : null}
      {tab === 'wheel' ? <SpinWheel /> : null}
      {tab === 'coin' ? <CoinFlip /> : null}
    </div>
  )
}

function TabButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" role="tab" aria-selected={selected} className={selected ? 'chip chip-on' : 'chip'} onClick={onClick}>
      {children}
    </button>
  )
}

function ThisOrThat() {
  const { couple, uid, partnerId, partner, vote, healMatch, resetVotes } = useCouple()
  const { t, err, phrase, locale } = useI18n()
  const [category, setCategory] = useState<DeckCategory>('movies')
  const [fly, setFly] = useState<'like' | 'skip' | null>(null)
  const [error, setError] = useState('')
  const [celebration, setCelebration] = useState<MatchEntry | null>(null)
  const seen = useRef<Set<string> | null>(null)
  const healing = useRef(new Set<string>())
  const items = DECK.filter((item) => item.category === category)
  const current = items.find((item) => !couple.votes[item.id]?.[uid])
  const matches = useMemo(
    () => Object.values(couple.matches).filter((match) => match.category === category).sort((a, b) => b.matchedAt - a.matchedAt),
    [category, couple.matches],
  )

  useEffect(() => {
    const ids = Object.keys(couple.matches)
    if (seen.current === null) {
      seen.current = new Set(ids)
      return
    }
    const fresh = ids.filter((id) => !seen.current?.has(id))
    fresh.forEach((id) => seen.current?.add(id))
    if (fresh[0] && couple.matches[fresh[0]]) setCelebration(couple.matches[fresh[0]])
  }, [couple.matches])

  useEffect(() => {
    if (!partnerId) return
    for (const item of DECK) {
      const votes = couple.votes[item.id]
      if (votes?.[uid] === 'like' && votes[partnerId] === 'like' && !couple.matches[item.id] && !healing.current.has(item.id)) {
        healing.current.add(item.id)
        void healMatch(item).catch(() => healing.current.delete(item.id))
      }
    }
  }, [couple.matches, couple.votes, healMatch, partnerId, uid])

  async function choose(item: DeckItem, choice: 'like' | 'skip') {
    if (fly) return
    setFly(choice)
    window.setTimeout(() => {
      void vote(item, choice)
        .catch((reason) => setError(err(reason)))
        .finally(() => setFly(null))
    }, 180)
  }

  return (
    <div className="grid gap-4">
      <div className="chip-row">
        {DECK_CATEGORIES.map((item) => (
          <button key={item.id} type="button" className={category === item.id ? 'chip chip-on shrink-0' : 'chip shrink-0'} onClick={() => setCategory(item.id)}>
            {t(categoryKey(item.id))}
          </button>
        ))}
      </div>
      {current ? (
        <div className="relative">
          <motion.article
            key={current.id}
            className="surface relative min-h-72 p-6"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            animate={{ x: fly === 'like' ? 280 : fly === 'skip' ? -280 : 0, opacity: fly ? 0 : 1 }}
            onDragEnd={(_event, info) => {
              if (info.offset.x > 90) void choose(current, 'like')
              else if (info.offset.x < -90) void choose(current, 'skip')
            }}
          >
            <p className="text-sm font-extrabold text-[var(--muted)] uppercase">{t(categoryKey(category))}</p>
            <p className="mt-4 text-6xl" aria-hidden="true">{current.emoji}</p>
            <h2 className="font-display mt-3 text-4xl">{phrase(current.title)}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{phrase(current.detail)}</p>
            <p className="mt-6 text-xs font-bold text-[var(--muted)]">{t('together.swipe')}</p>
          </motion.article>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => void choose(current, 'skip')}>{t('together.skip')}</Button>
            <Button onClick={() => void choose(current, 'like')}>{t('together.like')}</Button>
          </div>
        </div>
      ) : (
        <EmptyState
          title={t('together.seen')}
          body={t('together.seenBody')}
          action={<Button variant="soft" onClick={() => void resetVotes(items.map((item) => item.id)).catch((reason) => setError(err(reason)))}>{t('together.reset')}</Button>}
        />
      )}
      <ErrorNote>{error}</ErrorNote>
      <section>
        <h2 className="mb-2 font-extrabold">{t('together.matches')}</h2>
        {matches.length ? (
          <ul className="grid gap-2">
            {matches.map((match) => (
              <li key={match.itemId} className="surface flex items-center justify-between px-4 py-3">
                <span className="font-extrabold">{match.emoji} {phrase(match.title)}</span>
                <span className="text-xs text-[var(--muted)]">{formatWhen(match.matchedAt, locale)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">{t('together.matchEmpty')}</p>
        )}
      </section>
      {celebration ? (
        <div className="modal-back">
          <div className="modal-card relative overflow-hidden text-center" role="dialog" aria-modal="true" aria-label={t('together.matchLabel')}>
            <Confetti show />
            <HeartBurst show />
            <p className="text-5xl" aria-hidden="true">{celebration.emoji}</p>
            <h2 className="font-display mt-2 text-4xl">{t('together.matchTitle')}</h2>
            <p className="mt-2 font-extrabold">{phrase(celebration.title)}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{t('together.matchBody', { name: partner?.displayName ?? t('common.yourPerson') })}</p>
            <Button className="mt-4" onClick={() => setCelebration(null)}>{t('together.keep')}</Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SpinWheel() {
  const { couple, uid, partner, addOption, removeOption, shareSpin } = useCouple()
  const { t, err, phrase, locale } = useI18n()
  const toast = useToast()
  const reduce = useReducedMotion()
  const options = Object.values(couple.wheelOptions)
  const [label, setLabel] = useState('')
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [error, setError] = useState('')
  const gradient = options.length
    ? `conic-gradient(${options.map((_option, index) => `${WHEEL_COLORS[index % WHEEL_COLORS.length]} ${(index / options.length) * 360}deg ${((index + 1) / options.length) * 360}deg`).join(',')})`
    : 'conic-gradient(#FFD6E7 0 360deg)'

  async function spin() {
    if (spinning || options.length < 2) return
    const index = Math.floor(Math.random() * options.length)
    const slice = 360 / options.length
    const center = (index + 0.5) * slice
    const current = ((rotation % 360) + 360) % 360
    const target = (360 - center) % 360
    let delta = target - current
    if (delta < 0) delta += 360
    const next = rotation + 360 * (reduce ? 0 : 6) + delta
    setSpinning(true)
    setRotation(next)
    window.setTimeout(() => {
      void shareSpin(options[index].label)
        .then(() => toast(t('together.shared')))
        .catch((reason) => setError(err(reason)))
        .finally(() => setSpinning(false))
    }, reduce ? 20 : 4200)
  }

  return (
    <div className="grid gap-4">
      <div className="relative mx-auto h-72 w-72">
        <div className="wheel-pointer" aria-hidden="true" />
        <div className="wheel" style={{ background: gradient, transform: `rotate(${rotation}deg)`, transitionDuration: reduce ? '0ms' : '4s' }}>
          {options.map((option, index) => (
            <span key={option.id} className="wheel-label" style={{ transform: `rotate(${(index + 0.5) * (360 / options.length)}deg) translateY(-96px)` }}>
              {phrase(option.label)}
            </span>
          ))}
        </div>
      </div>
      <Button onClick={() => void spin()} disabled={spinning || options.length < 2}>{spinning ? t('together.spinning') : t('together.spinButton')}</Button>
      {couple.wheelResult ? (
        <Card className="p-4 text-center">
          <p className="text-sm font-extrabold text-[var(--muted)]">{t('together.latestSpin')}</p>
          <p className="font-display text-3xl">{phrase(couple.wheelResult.label)}</p>
          <p className="text-xs text-[var(--muted)]">{couple.wheelResult.spunBy === uid ? t('common.you') : partner?.displayName ?? t('common.yourPerson')} · {formatWhen(couple.wheelResult.spunAt, locale)}</p>
        </Card>
      ) : null}
      <form className="grid grid-cols-[1fr_auto] gap-2" onSubmit={(event) => { event.preventDefault(); void addOption(label).then(() => setLabel('')).catch((reason) => setError(err(reason))) }}>
        <Field label={t('together.custom')} name="option" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={60} />
        <Button className="self-end" type="submit">{t('common.add')}</Button>
      </form>
      <ul className="grid gap-2">
        {options.map((option) => (
          <li key={option.id} className="flex items-center justify-between gap-3 text-sm">
            <span>{phrase(option.label)}</span>
            <button type="button" className="font-extrabold" onClick={() => void removeOption(option.id).catch((reason) => setError(err(reason)))} disabled={options.length <= 2}>
              {t('common.remove')}
            </button>
          </li>
        ))}
      </ul>
      <ErrorNote>{error}</ErrorNote>
    </div>
  )
}

function CoinFlip() {
  const { couple, uid, partner, saveCoin, shareFlip } = useCouple()
  const { t, err, phrase, locale } = useI18n()
  const reduce = useReducedMotion()
  const [sideA, setSideA] = useState(couple.coin.sideA)
  const [sideB, setSideB] = useState(couple.coin.sideB)
  const [rotation, setRotation] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSideA(couple.coin.sideA)
    setSideB(couple.coin.sideB)
  }, [couple.coin.sideA, couple.coin.sideB])

  function flip() {
    if (busy) return
    const heads = Math.random() < 0.5
    const result = heads ? couple.coin.sideA : couple.coin.sideB
    const turns = reduce ? 0 : 5
    setBusy(true)
    setRotation((value) => value + 360 * turns + (heads ? 0 : 180) - (((value % 360) + 360) % 360))
    window.setTimeout(() => {
      void shareFlip(result).catch((reason) => setError(err(reason))).finally(() => setBusy(false))
    }, reduce ? 20 : 1600)
  }

  return (
    <div className="grid gap-4">
      <div className="coin-scene">
        <div className="coin" style={{ transform: `rotateY(${rotation}deg)`, transitionDuration: reduce ? '0ms' : '1.5s' }}>
          <div className="coin-face">{phrase(couple.coin.sideA)}</div>
          <div className="coin-face coin-back">{phrase(couple.coin.sideB)}</div>
        </div>
      </div>
      <Button onClick={flip} disabled={busy}>{busy ? t('together.flipping') : t('together.flip')}</Button>
      {couple.coin.lastFlip ? (
        <Card className="p-4 text-center">
          <p className="text-sm font-extrabold text-[var(--muted)]">{t('together.latestFlip')}</p>
          <p className="font-display text-3xl">{phrase(couple.coin.lastFlip.result)}</p>
          <p className="text-xs text-[var(--muted)]">{couple.coin.lastFlip.flippedBy === uid ? t('common.you') : partner?.displayName ?? t('common.yourPerson')} · {formatWhen(couple.coin.lastFlip.flippedAt, locale)}</p>
        </Card>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {COIN_PRESETS.map(([a, b]) => (
          <button key={a} type="button" className="chip" onClick={() => { setSideA(a); setSideB(b) }}>{phrase(a)}</button>
        ))}
      </div>
      <Field label={t('together.sideA')} name="sideA" value={sideA} maxLength={40} onChange={(event) => setSideA(event.target.value)} />
      <Field label={t('together.sideB')} name="sideB" value={sideB} maxLength={40} onChange={(event) => setSideB(event.target.value)} />
      <Button variant="soft" onClick={() => void saveCoin(sideA, sideB).catch((reason) => setError(err(reason)))}>{t('together.saveCoin')}</Button>
      <ErrorNote>{error}</ErrorNote>
    </div>
  )
}
