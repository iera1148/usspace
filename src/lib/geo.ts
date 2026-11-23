export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radius = 6371
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatDistance(km: number) {
  if (km < 0.05) return 'You are in the same place right now ♡'
  if (km < 10) return `You're currently ${km.toFixed(1)} km apart ♡`
  return `You're currently ${Math.round(km)} km apart ♡`
}

export function weatherLabel(code: number) {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Cloudy'
  if (code <= 48) return 'Fog'
  if (code <= 67) return 'Rain'
  if (code <= 77) return 'Snow'
  if (code <= 82) return 'Showers'
  if (code >= 95) return 'Storm'
  return 'Weather'
}

export function assertCoordinates(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('Those coordinates do not look real, so nothing was saved.')
  }
}
