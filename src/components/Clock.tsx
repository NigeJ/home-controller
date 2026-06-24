import { useClock } from '../hooks/useClock'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function Clock() {
  const now = useClock()

  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  const s = now.getSeconds().toString().padStart(2, '0')

  const dateStr = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`

  return (
    <div style={{ textAlign: 'center' }}>
      <div className="clock">
        {h}:{m}<span style={{ opacity: 0.45, fontSize: '0.55em' }}>:{s}</span>
      </div>
      <div className="clock-date">{dateStr}</div>
    </div>
  )
}
