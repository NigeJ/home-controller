const CONDITION_ICONS: Record<string, string> = {
  sunny: '☀️',
  'clear-night': '🌙',
  partlycloudy: '⛅',
  cloudy: '☁️',
  fog: '🌫️',
  windy: '💨',
  'windy-variant': '🌬️',
  rainy: '🌧️',
  pouring: '⛈️',
  lightning: '⚡',
  'lightning-rainy': '⛈️',
  snowy: '❄️',
  'snowy-rainy': '🌨️',
  hail: '🌨️',
  exceptional: '⚠️',
}

export function WeatherIcon({ condition }: { condition: string | null }) {
  if (!condition) return <span className="weather-icon">🌡️</span>
  const icon = CONDITION_ICONS[condition] ?? '🌤️'
  return <span className="weather-icon">{icon}</span>
}
