import { Clock } from './Clock'
import { WeatherIcon } from './WeatherIcon'
import type { HomeData } from '../types'

interface Props {
  data: HomeData
}

function fmt(val: number | null, unit = '°') {
  if (val === null) return '--'
  return `${Math.round(val)}${unit}`
}

function fmtTime(date: Date) {
  return date.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function capitalize(s: string | null) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
}

export function Header({ data }: Props) {
  const { indoorTemp, weather, nextSunEvent, haAvailable, lastUpdated } = data

  return (
    <header className="header">
      <Clock />
      <div className="header-meta">
        {indoorTemp !== null && (
          <div className="temp-pill">
            <span className="temp-value">{fmt(indoorTemp)}</span>
            <span className="temp-label">Indoor</span>
          </div>
        )}

        <div className="weather-block">
          <WeatherIcon condition={weather.condition} />
          <div className="weather-detail">
            <span className="weather-condition">{capitalize(weather.condition) || 'No forecast'}</span>
            {weather.forecastHigh !== null && weather.forecastLow !== null && (
              <span className="weather-forecast">{fmt(weather.forecastHigh)} / {fmt(weather.forecastLow)}</span>
            )}
          </div>
          {weather.tempOutdoor !== null && (
            <span className="weather-current">{fmt(weather.tempOutdoor, '°')}</span>
          )}
        </div>

        {nextSunEvent && (
          <div className="weather-pill">
            <span className="weather-icon">{nextSunEvent.type === 'dawn' ? '🌅' : '🌇'}</span>
            <span className="weather-text">{fmtTime(nextSunEvent.time)}</span>
          </div>
        )}

        {!haAvailable && lastUpdated && (
          <span className="ha-offline">HA offline</span>
        )}
      </div>
    </header>
  )
}
