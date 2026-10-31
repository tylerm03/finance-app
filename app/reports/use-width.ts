'use client'

import { useEffect, useRef, useState } from 'react'

// Tracks an element's width so SVG charts can lay themselves out to fit
export function useWidth<T extends HTMLElement>(initial = 1000) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(initial)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width)
      if (w > 0) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}
