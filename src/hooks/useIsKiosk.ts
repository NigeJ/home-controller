import { useState, useEffect } from 'react'

const MQ = '(display-mode: standalone)'

export function useIsKiosk() {
  const [isKiosk, setIsKiosk] = useState(() => window.matchMedia(MQ).matches)

  useEffect(() => {
    const mq = window.matchMedia(MQ)
    const handler = (e: MediaQueryListEvent) => setIsKiosk(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isKiosk
}
