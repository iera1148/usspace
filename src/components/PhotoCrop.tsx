import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Button, Modal } from './ui.tsx'
import { useI18n } from '../i18n/LocaleContext.tsx'
import { clampCropOffset, cropProfilePhoto, loadImageFile, zoomLimits } from '../lib/image.ts'

export function PhotoCrop({
  file,
  busy,
  onCancel,
  onConfirm,
}: {
  file: File | null
  busy: boolean
  onCancel: () => void
  onConfirm: (photoURL: string) => void | Promise<void>
}) {
  const { t, err } = useI18n()
  const stageRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)
  const frame = useRef({ zoom: 1, offsetX: 0, offsetY: 0, view: 280 })
  const report = useRef(err)
  report.current = err
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [view, setView] = useState(280)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!file) {
      imageRef.current = null
      setImage(null)
      setError('')
      return
    }
    let cancelled = false
    let active: HTMLImageElement | null = null
    setZoom(1)
    setOffsetX(0)
    setOffsetY(0)
    setError('')
    loadImageFile(file).then(
      (next) => {
        if (cancelled) {
          URL.revokeObjectURL(next.src)
          return
        }
        active = next
        imageRef.current = next
        setImage(next)
      },
      (reason) => {
        if (!cancelled) setError(report.current(reason))
      },
    )
    return () => {
      cancelled = true
      if (active) URL.revokeObjectURL(active.src)
      imageRef.current = null
    }
  }, [file])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const measure = () => setView(stage.clientWidth || 280)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const source = imageRef.current
      if (!source) return
      const limitsNow = zoomLimits(source)
      const next = Math.min(limitsNow.max, Math.max(limitsNow.min, frame.current.zoom + (event.deltaY < 0 ? 0.08 : -0.08)))
      const clamped = clampCropOffset(source, next, frame.current.offsetX, frame.current.offsetY, frame.current.view)
      setZoom(next)
      setOffsetX(clamped.offsetX)
      setOffsetY(clamped.offsetY)
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      observer.disconnect()
      stage.removeEventListener('wheel', onWheel)
    }
  }, [image])

  frame.current = { zoom, offsetX, offsetY, view }
  const limits = image ? zoomLimits(image) : { min: 0.8, max: 3 }
  const placed = image ? placement(image, zoom, offsetX, offsetY, view) : null

  function moveZoom(next: number) {
    if (!image) return
    const clampedZoom = Math.min(limits.max, Math.max(limits.min, next))
    const clamped = clampCropOffset(image, clampedZoom, frame.current.offsetX, frame.current.offsetY, frame.current.view)
    setZoom(clampedZoom)
    setOffsetX(clamped.offsetX)
    setOffsetY(clamped.offsetY)
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!image) return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Drag still follows the pointer when capture is unavailable.
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    pinch.current = null
    if (pointers.current.size === 1) {
      drag.current = { x: event.clientX, y: event.clientY, ox: frame.current.offsetX, oy: frame.current.offsetY }
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!image || !pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size >= 2) {
      const [first, second] = [...pointers.current.values()]
      const distance = Math.hypot(first.x - second.x, first.y - second.y)
      if (!pinch.current) pinch.current = { distance, zoom: frame.current.zoom }
      else moveZoom(pinch.current.zoom * (distance / pinch.current.distance))
      drag.current = null
      return
    }
    if (!drag.current) return
    const nextX = drag.current.ox + event.clientX - drag.current.x
    const nextY = drag.current.oy + event.clientY - drag.current.y
    const clamped = clampCropOffset(image, frame.current.zoom, nextX, nextY, frame.current.view)
    setOffsetX(clamped.offsetX)
    setOffsetY(clamped.offsetY)
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId)
    pinch.current = null
    drag.current = null
    if (pointers.current.size === 1) {
      const point = [...pointers.current.values()][0]
      drag.current = { x: point.x, y: point.y, ox: frame.current.offsetX, oy: frame.current.offsetY }
    }
  }

  function usePhoto() {
    const source = imageRef.current
    if (!source) return
    try {
      void Promise.resolve(onConfirm(cropProfilePhoto(source, frame.current))).catch((reason) => setError(err(reason)))
    } catch (reason) {
      setError(err(reason))
    }
  }

  return (
    <Modal open={file !== null} title={t('settings.photoAdjust')} onClose={onCancel}>
      <div className="grid gap-3">
        <div
          ref={stageRef}
          className="crop-stage"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {placed ? (
            <img
              src={placed.src}
              alt=""
              draggable={false}
              style={{ width: placed.width, height: placed.height, transform: `translate(${placed.x}px, ${placed.y}px)` }}
            />
          ) : (
            <span className="text-sm font-extrabold">{error ? '' : t('settings.photoOpening')}</span>
          )}
        </div>
        <div className="crop-zoom">
          <button type="button" className="crop-step" onClick={() => moveZoom(zoom - 0.12)} disabled={!image || busy} aria-label={t('settings.zoomOut')}>
            −
          </button>
          <input
            type="range"
            min={limits.min}
            max={limits.max}
            step={0.01}
            value={Math.min(limits.max, Math.max(limits.min, zoom))}
            disabled={!image || busy}
            aria-label={t('settings.photoZoom')}
            onChange={(event) => moveZoom(Number(event.target.value))}
          />
          <button type="button" className="crop-step" onClick={() => moveZoom(zoom + 0.12)} disabled={!image || busy} aria-label={t('settings.zoomIn')}>
            +
          </button>
        </div>
        <div className="flex justify-between text-xs font-extrabold text-[var(--muted)]">
          <span>{t('settings.zoomOut')}</span>
          <span>{t('settings.zoomIn')}</span>
        </div>
        <p className="text-sm text-[var(--muted)]">{t('settings.photoDrag')}</p>
        {error ? <p className="text-sm font-bold text-[var(--danger)]">{error}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" disabled={busy} onClick={onCancel}>{t('settings.photoCancel')}</Button>
          <Button disabled={!image || busy} onClick={usePhoto}>{busy ? t('settings.photoUploading') : t('settings.photoUse')}</Button>
        </div>
      </div>
    </Modal>
  )
}

function placement(image: HTMLImageElement, zoom: number, offsetX: number, offsetY: number, view: number) {
  const scale = (view / Math.min(image.width, image.height)) * zoom
  const width = image.width * scale
  const height = image.height * scale
  return {
    src: image.src,
    width,
    height,
    x: (view - width) / 2 + offsetX,
    y: (view - height) / 2 + offsetY,
  }
}
