export interface HAState {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
  last_updated: string
}

export interface HeatPumpStatus {
  mode: string
  setTemp: number
  currentTemp: number
  fanMode: string | null
  hvacModes: string[]
  fanModes: string[]
  isOn: boolean
  available: boolean
}

export interface PlugStatus {
  id: string
  label: string
  entityId: string
  on: boolean
  available: boolean
}

export interface WeatherData {
  tempOutdoor: number | null
  condition: string | null
  forecastHigh: number | null
  forecastLow: number | null
  forecastLabel: string | null
  available: boolean
}

export interface SunEvent {
  type: 'dawn' | 'dusk'
  time: Date
}

export interface HeatTransferData {
  isOn: boolean
  onTemp: number | null
  offTemp: number | null
  available: boolean
  entityId: string
}

export interface HomeData {
  indoorTemp: number | null
  heatPump: HeatPumpStatus
  heatTransfer: HeatTransferData
  plugs: PlugStatus[]
  weather: WeatherData
  nextSunEvent: SunEvent | null
  lastUpdated: Date | null
  haAvailable: boolean
}

export type Scene = 'away' | 'home' | 'bedtime'

export type MorningTask = {
  id: string
  label: string
  emoji: string
  done: boolean
}
