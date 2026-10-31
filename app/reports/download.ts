'use client'

function save(canvas: HTMLCanvasElement, filename: string) {
  const a = document.createElement('a')
  a.download = filename
  a.href = canvas.toDataURL('image/png')
  a.click()
}

// Turns the chart's SVG into a PNG file (2x for sharpness, white background)
export function downloadSvgAsPng(container: HTMLElement | null, filename: string) {
  const svg = container?.querySelector('svg.recharts-surface, svg[data-chart], [data-chart] svg') as SVGSVGElement | null
  if (!svg) return
  const { width, height } = svg.getBoundingClientRect()
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  const font = getComputedStyle(svg).fontFamily
  clone.setAttribute('style', 'font-family:' + font)

  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }))
  const img = new Image()
  img.onload = () => {
    const scale = 2
    const pad = 24
    const canvas = document.createElement('canvas')
    canvas.width = (width + pad * 2) * scale
    canvas.height = (height + pad * 2) * scale
    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width + pad * 2, height + pad * 2)
    ctx.drawImage(img, pad, pad, width, height)
    URL.revokeObjectURL(url)
    save(canvas, filename)
  }
  img.src = url
}

// Draws a simple summary card as a PNG
export function downloadSummaryPng(title: string, rangeLabel: string, rows: [string, string, string?][], filename: string) {
  const scale = 2
  const w = 420
  const h = 120 + rows.length * 40
  const canvas = document.createElement('canvas')
  canvas.width = w * scale
  canvas.height = h * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  const font = getComputedStyle(document.body).fontFamily
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#1f1d1a'
  ctx.font = '600 20px ' + font
  ctx.fillText(title, 28, 44)
  ctx.fillStyle = '#77736d'
  ctx.font = '500 14px ' + font
  ctx.fillText(rangeLabel, 28, 74)
  rows.forEach(([label, value, color], i) => {
    const y = 116 + i * 40
    ctx.fillStyle = '#77736d'
    ctx.font = '15px ' + font
    ctx.fillText(label, 28, y)
    ctx.fillStyle = color || '#1f1d1a'
    ctx.font = '500 17px ' + font
    ctx.textAlign = 'right'
    ctx.fillText(value, w - 28, y)
    ctx.textAlign = 'left'
  })
  save(canvas, filename)
}
