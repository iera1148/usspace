const IMAGE_NAME = /\.(avif|bmp|gif|heic|heif|jpe?g|png|webp)$/i

export type CropFrame = {
  zoom: number
  offsetX: number
  offsetY: number
  view: number
}

export function assertImageFile(file: File) {
  const type = file.type.toLowerCase()
  if (type && !type.startsWith('image/') && !IMAGE_NAME.test(file.name)) {
    throw new Error('Choose a JPEG, PNG, or WebP image.')
  }
}

export function compressImage(file: File, options?: { maxEdge?: number; maxChars?: number }) {
  const maxEdge = options?.maxEdge ?? 960
  const maxChars = options?.maxChars ?? 150_000
  try {
    assertImageFile(file)
  } catch (reason) {
    return Promise.reject(reason)
  }
  return loadImage(file).then((image) => {
    try {
      return encodeJpeg(image, maxEdge, maxChars)
    } finally {
      URL.revokeObjectURL(image.src)
    }
  })
}

export function loadImageFile(file: File) {
  assertImageFile(file)
  return loadImage(file)
}

export function zoomLimits(image: { width: number; height: number }) {
  const fit = Math.min(image.width, image.height) / Math.max(image.width, image.height)
  return { min: Math.min(fit, 0.8), max: 3 }
}

export function clampCropOffset(
  image: { width: number; height: number },
  zoom: number,
  offsetX: number,
  offsetY: number,
  view: number,
) {
  const scale = coverScale(image, view) * zoom
  const limitX = Math.max(0, (image.width * scale - view) / 2)
  const limitY = Math.max(0, (image.height * scale - view) / 2)
  return {
    offsetX: Math.min(limitX, Math.max(-limitX, offsetX)),
    offsetY: Math.min(limitY, Math.max(-limitY, offsetY)),
  }
}

export function cropProfilePhoto(image: HTMLImageElement, frame: CropFrame, maxChars = 120_000) {
  const view = Math.max(1, frame.view)
  const scale = coverScale(image, view) * frame.zoom
  const width = image.width * scale
  const height = image.height * scale
  const x = (view - width) / 2 + frame.offsetX
  const y = (view - height) / 2 + frame.offsetY
  const out = 512
  const ratio = out / view
  const canvas = document.createElement('canvas')
  canvas.width = out
  canvas.height = out
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare that image.')
  context.fillStyle = '#fff8f0'
  context.fillRect(0, 0, out, out)
  context.drawImage(image, x * ratio, y * ratio, width * ratio, height * ratio)
  return encodeCanvas(canvas, maxChars)
}

function coverScale(image: { width: number; height: number }, view: number) {
  return view / Math.min(image.width, image.height)
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not open that image. Choose a JPEG or PNG.'))
    }
    image.src = url
  })
}

function encodeJpeg(image: HTMLImageElement, maxEdge: number, maxChars: number) {
  let width = image.width
  let height = image.height
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  width = Math.max(1, Math.round(width * scale))
  height = Math.max(1, Math.round(height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare that image.')
  context.fillStyle = '#fff8f0'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  return encodeCanvas(canvas, maxChars)
}

function encodeCanvas(source: HTMLCanvasElement, maxChars: number) {
  let width = source.width
  let height = source.height
  let quality = 0.82
  let url = jpeg(source, width, height, quality)
  while (url.length > maxChars && (quality > 0.46 || width > 240)) {
    if (quality > 0.46) quality -= 0.08
    else {
      width = Math.max(240, Math.round(width * 0.8))
      height = Math.max(240, Math.round(height * 0.8))
    }
    url = jpeg(source, width, height, quality)
  }
  if (url.length > maxChars) throw new Error('That image is still too big. Choose a smaller photo.')
  return url
}

function jpeg(source: HTMLCanvasElement, width: number, height: number, quality: number) {
  if (width === source.width && height === source.height) return source.toDataURL('image/jpeg', quality)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return source.toDataURL('image/jpeg', quality)
  context.drawImage(source, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}
