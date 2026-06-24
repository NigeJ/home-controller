import { useState, useEffect, useCallback, useRef } from 'react'
import type { HomeData, HAState, PlugStatus, SunEvent, HeatPumpStatus } from '../types'

// In production, always use relative URLs so nginx proxies /api/ → HA.
// This works on local network AND over VPN — no mDNS needed.
// The auth token is NOT included here. In dev, vite.config.ts adds it to the proxy.
// In production, nginx adds it via proxy_set_header Authorization "Bearer <token>".
const HA_URL = import.meta.env.DEV
  ? '/ha'
  : (import.meta.env.VITE_HA_URL || '')

const HEADERS = {
  'Content-Type': 'application/json',
}

const PLUG_ENTITIES: { id: string; label: string; entityId: string }[] = [
  { id: 'mirror_light',   label: 'Mirror Light',   entityId: 'switch.tp_link_power_strip_3680_mirror_light' },
  { id: 'flower_light',   label: 'Flower Light',   entityId: 'switch.tp_link_power_strip_3680_flower_light' },
  { id: 'big_lamp',       label: 'Big Lamp',       entityId: 'switch.tp_link_power_strip_1ce2_big_lamp' },
  { id: 'antique_lamp',   label: 'Antique Lamp',   entityId: 'switch.tp_link_power_strip_c2ae_antique_lamp' },
  { id: 'outdoor_lights', label: 'Outdoor Lights', entityId: 'switch.outdoor_lights' },
]

const HEAT_TRANSFER_SWITCH   = 'switch.heat_transfer_fan'
const HEAT_TRANSFER_ON_TEMP  = 'input_number.heat_transfer_fan_on_temp'
const HEAT_TRANSFER_OFF_TEMP = 'input_number.heat_transfer_fan_off_temp'

const SUN_DAWN_ENTITY    = 'sensor.sun_next_dawn'
const SUN_DUSK_ENTITY    = 'sensor.sun_next_dusk'
const CLIMATE_ENTITY     = 'climate.heal_pump'
const INDOOR_TEMP_ENTITY = 'sensor.heal_pump_measured_value_of_room_temperature'
const OUTDOOR_TEMP_ENTITY = 'sensor.heal_pump_measured_outdoor_air_temperature'
const WEATHER_ENTITY     = 'weather.home'

async function fetchForecast(entityId: string): Promise<Array<Record<string, unknown>> | null> {
  try {
    const res = await fetch(`${HA_URL}/api/services/weather/get_forecasts?return_response`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ entity_id: entityId, type: 'daily' }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json() as { service_response: Record<string, { forecast: Array<Record<string, unknown>> }> }
    return data.service_response?.[entityId]?.forecast ?? null
  } catch {
    return null
  }
}

async function fetchState(entityId: string): Promise<HAState | null> {
  try {
    const res = await fetch(`${HA_URL}/api/states/${entityId}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    return res.json() as Promise<HAState>
  } catch {
    return null
  }
}

function parseTemp(state: HAState | null): number | null {
  if (!state || state.state === 'unavailable' || state.state === 'unknown') return null
  const v = parseFloat(state.state)
  return isNaN(v) ? null : v
}

export function useHomeAssistant() {
  const [data, setData] = useState<HomeData>({
    indoorTemp: null,
    heatPump: { mode: 'unknown', setTemp: 0, currentTemp: 0, fanMode: null, hvacModes: [], fanModes: [], isOn: false, available: false },
    heatTransfer: { isOn: false, onTemp: null, offTemp: null, available: false, entityId: HEAT_TRANSFER_SWITCH },
    plugs: PLUG_ENTITIES.map((p) => ({ ...p, on: false, available: false })),
    weather: {
      tempOutdoor: null,
      condition: null,
      forecastHigh: null,
      forecastLow: null,
      forecastLabel: null,
      available: false,
    },
    nextSunEvent: null,
    lastUpdated: null,
    haAvailable: false,
  })

  const [haError, setHaError] = useState<string | null>(null)
  const lastKnownRef = useRef<HomeData | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    const [climate, indoorTemp, outdoorTemp, weatherState, forecast, sunDawn, sunDusk,
           htSwitch, htOnTemp, htOffTemp, ...plugStates] = await Promise.all([
      fetchState(CLIMATE_ENTITY),
      fetchState(INDOOR_TEMP_ENTITY),
      fetchState(OUTDOOR_TEMP_ENTITY),
      fetchState(WEATHER_ENTITY),
      fetchForecast(WEATHER_ENTITY),
      fetchState(SUN_DAWN_ENTITY),
      fetchState(SUN_DUSK_ENTITY),
      fetchState(HEAT_TRANSFER_SWITCH),
      fetchState(HEAT_TRANSFER_ON_TEMP),
      fetchState(HEAT_TRANSFER_OFF_TEMP),
      ...PLUG_ENTITIES.map((p) => fetchState(p.entityId)),
    ])

    const haAvailable = climate !== null || indoorTemp !== null || htSwitch !== null || plugStates.some(s => s !== null)

    const heatPump = climate
      ? {
          mode: climate.state,
          setTemp: (climate.attributes.temperature as number) ?? 0,
          currentTemp: (climate.attributes.current_temperature as number) ?? 0,
          fanMode: (climate.attributes.fan_mode as string) ?? null,
          hvacModes: ((climate.attributes.hvac_modes as string[]) ?? []).filter(m => m !== 'off'),
          fanModes: (climate.attributes.fan_modes as string[]) ?? [],
          isOn: climate.state !== 'off' && climate.state !== 'unavailable',
          available: climate.state !== 'unavailable',
        }
      : lastKnownRef.current?.heatPump ?? {
          mode: 'unknown', setTemp: 0, currentTemp: 0,
          fanMode: null, hvacModes: [], fanModes: [],
          isOn: false, available: false,
        } as HeatPumpStatus

    const plugs: PlugStatus[] = PLUG_ENTITIES.map((p, i) => {
      const s = plugStates[i]
      if (!s) {
        return lastKnownRef.current?.plugs.find((lp) => lp.id === p.id) ?? { ...p, on: false, available: false }
      }
      return { ...p, on: s.state === 'on', available: s.state !== 'unavailable' }
    })

    const forecast0 = forecast?.[0] ?? null

    const weather = {
      tempOutdoor: parseTemp(outdoorTemp) ?? (weatherState ? (weatherState.attributes.temperature as number) : null),
      condition: weatherState?.state ?? null,
      forecastHigh: (forecast0?.temperature as number) ?? null,
      forecastLow: (forecast0?.templow as number) ?? null,
      forecastLabel: (forecast0?.condition as string) ?? null,
      available: weatherState !== null,
    }

    const dawnTime = sunDawn?.state ? new Date(sunDawn.state) : null
    const duskTime = sunDusk?.state ? new Date(sunDusk.state) : null
    let nextSunEvent: SunEvent | null = null
    if (dawnTime && duskTime) {
      nextSunEvent = dawnTime < duskTime
        ? { type: 'dawn', time: dawnTime }
        : { type: 'dusk', time: duskTime }
    } else if (dawnTime) {
      nextSunEvent = { type: 'dawn', time: dawnTime }
    } else if (duskTime) {
      nextSunEvent = { type: 'dusk', time: duskTime }
    }

    const heatTransfer = {
      isOn: htSwitch?.state === 'on',
      onTemp: parseTemp(htOnTemp),
      offTemp: parseTemp(htOffTemp),
      available: htSwitch !== null && htSwitch.state !== 'unavailable',
      entityId: HEAT_TRANSFER_SWITCH,
    }

    const next: HomeData = {
      indoorTemp: parseTemp(indoorTemp) ?? lastKnownRef.current?.indoorTemp ?? null,
      heatPump,
      heatTransfer,
      plugs,
      weather,
      nextSunEvent,
      lastUpdated: new Date(),
      haAvailable,
    }

    lastKnownRef.current = next
    setData(next)
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, [refresh])

  const callService = useCallback(
    async (domain: string, service: string, serviceData: Record<string, unknown>) => {
      try {
        const res = await fetch(`${HA_URL}/api/services/${domain}/${service}`, {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify(serviceData),
          signal: AbortSignal.timeout(5000),
        })
        if (!res.ok) throw new Error(`HA returned ${res.status}`)
        // Debounce the refresh so rapid service calls only trigger one poll
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = setTimeout(() => {
          void refresh()
          refreshTimerRef.current = null
        }, 1000)
      } catch {
        setHaError('Could not reach Home Assistant')
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
        errorTimerRef.current = setTimeout(() => setHaError(null), 3000)
      }
    },
    [refresh],
  )

  const activateScene = useCallback(
    (scene: string) => callService('scene', 'turn_on', { entity_id: `scene.${scene}` }),
    [callService],
  )

  const togglePlug = useCallback(
    (entityId: string, currentlyOn: boolean) =>
      callService('switch', currentlyOn ? 'turn_off' : 'turn_on', { entity_id: entityId }),
    [callService],
  )

  return { data, haError, refresh, activateScene, togglePlug, callService }
}
