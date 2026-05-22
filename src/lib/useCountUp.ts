import { useEffect, useRef, useState } from "react"

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

/**
 * Animates from the previous value to `target` over `duration` ms.
 * Returns the current animated value.
 */
export function useCountUp(target: number, duration = 380): number {
  const [display, setDisplay] = useState(target)
  const prev = useRef(target)
  const raf = useRef<number | null>(null)
  const startTime = useRef<number | null>(null)
  const startVal = useRef(target)

  useEffect(() => {
    if (target === prev.current) return
    startVal.current = prev.current
    prev.current = target
    startTime.current = null

    if (raf.current !== null) cancelAnimationFrame(raf.current)

    function step(now: number) {
      if (startTime.current === null) startTime.current = now
      const elapsed = now - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutQuart(progress)
      setDisplay(startVal.current + (target - startVal.current) * eased)
      if (progress < 1) {
        raf.current = requestAnimationFrame(step)
      } else {
        raf.current = null
      }
    }

    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current)
    }
  }, [target, duration])

  return display
}
