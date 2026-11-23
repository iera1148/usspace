import { useMemo } from 'react'

const COLORS = ['#FF79A8', '#DCD6FF', '#FFDCC8', '#D6EEFF', '#FFD6E7', '#FFF8F0']

export function Confetti({ show }: { show: boolean }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 26 }, (_, index) => ({
        id: index,
        left: `${(index * 37) % 100}%`,
        delay: `${(index % 7) * 0.05}s`,
        color: COLORS[index % COLORS.length],
      })),
    [],
  )
  if (!show) return null
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {bits.map((bit) => (
        <span key={bit.id} className="confetti" style={{ left: bit.left, animationDelay: bit.delay, background: bit.color }} />
      ))}
    </div>
  )
}

export function HeartBurst({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <span key={index} className="float-heart" style={{ left: `${12 + index * 10}%`, animationDelay: `${index * 0.08}s` }}>
          ♡
        </span>
      ))}
    </div>
  )
}

export function FloatingDecor() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden" aria-hidden="true">
      <span className="doodle left-[8%] top-6">♡</span>
      <span className="doodle left-[78%] top-10">✦</span>
      <span className="doodle left-[88%] top-24 text-xs">✧</span>
    </div>
  )
}
