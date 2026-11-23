import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button, Card, ErrorNote, PageTitle } from '../components/ui.tsx'
import { useAuth } from '../context/AuthContext.tsx'
import { useCouple } from '../context/CoupleContext.tsx'
import { useToast } from '../context/ToastContext.tsx'
import { haversineKm, weatherLabel } from '../lib/geo.ts'
import { useI18n } from '../i18n/LocaleContext.tsx'
import { formatWhen } from '../lib/format.ts'

interface Forecast {
  temp: number
  label: string
  timezone: string
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)
}

export function MapPage() {
  const { profile, savePreferences } = useAuth()
  const { couple, uid, me, partner, partnerId, pingLocation, removeMyLocation } = useCouple()
  const { t, err } = useI18n()
  const toast = useToast()
  const host = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const pinsRef = useRef<L.LayerGroup | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [forecasts, setForecasts] = useState<Record<string, Forecast>>({})
  const [clock, setClock] = useState(() => new Date())

  const pins = useMemo(() => {
    return [uid, partnerId].flatMap((id) => {
      if (!id || !couple.locations[id]) return []
      const person = id === uid ? me : partner
      return [{ id, name: person?.displayName ?? t('map.partner'), ...couple.locations[id] }]
    })
  }, [couple.locations, me, partner, partnerId, t, uid])
  const pinKey = pins.map((pin) => `${pin.id}:${pin.lat}:${pin.lng}`).join('|')

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 30000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!host.current || mapRef.current) return
    const map = L.map(host.current, { scrollWheelZoom: false }).setView([20, 0], 2)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map
    pinsRef.current = L.layerGroup().addTo(map)
    return () => {
      map.remove()
      mapRef.current = null
      pinsRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const group = pinsRef.current
    if (!map || !group) return
    group.clearLayers()
    const bounds: L.LatLngExpression[] = []
    pins.forEach((pin) => {
      const icon = L.divIcon({
        className: 'map-pin',
        html: `<span>${escapeHtml(pin.name.slice(0, 1))}</span>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })
      L.marker([pin.lat, pin.lng], { icon, title: pin.name }).addTo(group)
      bounds.push([pin.lat, pin.lng])
    })
    if (bounds.length === 1) map.setView(bounds[0], 11)
    else if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [36, 36] })
  }, [pinKey, pins])

  useEffect(() => {
    let cancel = false
    pins.forEach((pin) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${pin.lat}&longitude=${pin.lng}&current=temperature_2m,weather_code&timezone=auto`
      void fetch(url)
        .then((response) => response.json())
        .then((data: { timezone?: string; current?: { temperature_2m?: number; weather_code?: number } }) => {
          if (cancel || !data.current || typeof data.current.temperature_2m !== 'number') return
          setForecasts((current) => ({
            ...current,
            [pin.id]: {
              temp: data.current?.temperature_2m ?? 0,
              label: weatherLabel(data.current?.weather_code ?? 0),
              timezone: data.timezone || '',
            },
          }))
        })
        .catch(() => undefined)
    })
    return () => {
      cancel = true
    }
  }, [pinKey, pins])

  function ping() {
    if (profile?.locationSharing === false) {
      setError(err(new Error('Location sharing is off in Settings. Turn it on before pinging a spot.')))
      return
    }
    if (!navigator.geolocation) {
      setError(err(new Error('This browser cannot read your location.')))
      return
    }
    setBusy(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void pingLocation(position.coords.latitude, position.coords.longitude)
          .then(() => toast(t('map.shared')))
          .catch((reason) => setError(err(reason)))
          .finally(() => setBusy(false))
      },
      (geoError) => {
        setBusy(false)
        if (geoError.code === geoError.PERMISSION_DENIED) setError(err(new Error('Location permission was denied. UsSpace still works without a pin.')))
        else if (geoError.code === geoError.TIMEOUT) setError(err(new Error('Location timed out. Try again when the signal is clearer.')))
        else setError(err(new Error('Could not read your location.')))
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  const mine = couple.locations[uid]
  const theirs = partnerId ? couple.locations[partnerId] : undefined
  const kilometres = mine && theirs ? haversineKm(mine, theirs) : null
  const distance = kilometres === null ? '' : kilometres < 0.05 ? t('map.same') : t('map.apart', { km: kilometres < 10 ? kilometres.toFixed(1) : String(Math.round(kilometres)) })

  return (
    <div className="grid gap-4">
      <PageTitle title={t('map.title')} />
      <div ref={host} className="map-frame" role="region" aria-label={t('map.region')} />
      <p className="fine-print">{t('map.credit')}</p>
      {distance ? <Card className="p-4"><p className="font-display text-3xl">{distance}</p></Card> : <p className="text-sm text-[var(--muted)]">{t('map.distanceWait')}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={ping} disabled={busy}>{busy ? t('map.finding') : t('map.ping')}</Button>
        <Button variant="ghost" onClick={() => void removeMyLocation().then(() => toast(t('map.deleted'))).catch((reason) => setError(err(reason)))} disabled={!mine}>
          {t('map.delete')}
        </Button>
      </div>
      <Card className="grid gap-3 p-4">
        <PinSummary name={me.displayName} location={mine} forecast={forecasts[uid]} now={clock} mine />
        <PinSummary name={partner?.displayName ?? t('common.yourPerson')} location={theirs} forecast={partnerId ? forecasts[partnerId] : undefined} now={clock} />
      </Card>
      <label className="flex items-center gap-3 text-sm font-bold">
        <input
          type="checkbox"
          checked={profile?.locationSharing !== false}
          onChange={(event) => {
            void savePreferences({ locationSharing: event.target.checked })
              .then(() => {
                if (!event.target.checked) return removeMyLocation()
              })
              .catch((reason) => setError(err(reason)))
          }}
        />
        {t('map.allow')}
      </label>
      <ErrorNote>{error}</ErrorNote>
    </div>
  )
}

function PinSummary({
  name,
  location,
  forecast,
  now,
  mine,
}: {
  name: string
  location?: { lat: number; lng: number; updatedAt: number }
  forecast?: Forecast
  now: Date
  mine?: boolean
}) {
  const { t, phrase, locale } = useI18n()
  const time = forecast?.timezone
    ? new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: forecast.timezone }).format(now)
    : mine
      ? new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(now)
      : ''
  return (
    <div>
      <p className="font-extrabold">{name}</p>
      {location ? (
        <>
          <p className="text-sm text-[var(--muted)]">{t('map.lastShared', { when: formatWhen(location.updatedAt, locale), lat: location.lat.toFixed(2), lng: location.lng.toFixed(2) })}</p>
          <p className="text-sm">{time ? t('map.localTime', { time }) : t('map.localWait')}{forecast ? ` · ${phrase(forecast.label)}, ${Math.round(forecast.temp)}°` : ''}</p>
        </>
      ) : (
        <p className="text-sm text-[var(--muted)]">{mine ? t('map.noneMine') : t('map.noneTheirs')}</p>
      )}
    </div>
  )
}
