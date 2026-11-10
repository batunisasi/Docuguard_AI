import { useEffect, useState } from 'react'

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Reveals `text` one character at a time. Returns the typed slice and a done flag. */
export function useTypewriter(text: string, { speed = 55, startDelay = 350, enabled = true } = {}) {
  const skip = !enabled || reduceMotion()
  const [count, setCount] = useState(skip ? text.length : 0)

  useEffect(() => {
    if (skip) { setCount(text.length); return }
    setCount(0)
    let i = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      i += 1
      setCount(i)
      if (i < text.length) timer = setTimeout(tick, speed + Math.random() * 20 - 10) // slight human jitter
    }
    timer = setTimeout(tick, startDelay)
    return () => clearTimeout(timer)
  }, [text, speed, startDelay, skip])

  return { typed: text.slice(0, count), done: count >= text.length }
}
