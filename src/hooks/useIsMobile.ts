import { useState, useEffect } from 'react'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 800)

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 800) }
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return isMobile
}
