import { useState, useRef, useEffect } from 'react'
import type { HeatPumpStatus, HeatTransferData } from '../types'

const ENTITY_ID = 'climate.heal_pump'
const MIN_TEMP = 16
const MAX_TEMP = 30

// SVG dial geometry
const D = 280
const CX = D / 2
const CY = D / 2
const R = 114
const TRACK_W = 14
const START = 225      // degrees clockwise from 12 o'clock
const SWEEP = 270

const MODE_COLOR: Record<string, string> = {
  heat:      '#f5a623',
  cool:      '#4f9cf9',
  heat_cool: '#a78bfa',
  dry:       '#fbbf24',
  fan_only:  '#34d399',
  off:       '#3a4a66',
  unknown:   '#3a4a66',
}

const MODE_LABELS: Record<string, string> = {
  heat_cool: 'Heat/Cool',
  heat:      'Heat',
  cool:      'Cool',
  dry:       'Dry',
  fan_only:  'Fan only',
}

const MODE_ORDER = ['heat_cool', 'heat', 'cool', 'dry', 'fan_only']

const FAN_MODE_MAP: Record<string, string> = {
  'auto':        'Auto',
  'minimum':     'Whisper',
  'low':         '1',
  'medium-low':  '2',
  'medium-high': '3',
  'high':        '4',
}

function polar(angleDeg: number) {
  const r = angleDeg * Math.PI / 180
  return { x: CX + R * Math.sin(r), y: CY - R * Math.cos(r) }
}

function arc(sweepDeg: number): string {
  if (sweepDeg <= 0) return ''
  const s = Math.min(sweepDeg, 269.99)
  const a = polar(START)
  const b = polar(START + s)
  const large = s > 180 ? 1 : 0
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`
}

function fmt(t: number) {
  return Number.isInteger(t) ? `${t}°` : `${t.toFixed(1)}°`
}

interface Props {
  heatPump: HeatPumpStatus
  heatTransfer: HeatTransferData
  callService: (domain: string, service: string, data: Record<string, unknown>) => Promise<void>
}

export function HeatPumpControl({ heatPump, heatTransfer, callService }: Props) {
  const [localTemp, setLocalTemp] = useState<number | null>(null)
  const pendingRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear local override when HA confirms the new value
  useEffect(() => {
    setLocalTemp(null)
    pendingRef.current = null
  }, [heatPump.setTemp])

  // Clean up debounce timer on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const { isOn, mode, currentTemp, fanMode, fanModes } = heatPump
  const displayTemp = localTemp ?? heatPump.setTemp
  const color = isOn ? (MODE_COLOR[mode] ?? MODE_COLOR.heat) : MODE_COLOR.off
  const pct = heatPump.setTemp > 0
    ? Math.max(0, Math.min(1, (displayTemp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)))
    : 0
  const fillSweep = pct * SWEEP
  const dot = fillSweep > 4 ? polar(START + fillSweep) : null

  const modes = heatPump.hvacModes.length > 0
    ? MODE_ORDER.filter(m => heatPump.hvacModes.includes(m))
    : MODE_ORDER

  function adjustTemp(delta: number) {
    if (!isOn) return
    const base = pendingRef.current ?? heatPump.setTemp
    const next = Math.max(MIN_TEMP, Math.min(MAX_TEMP, base + delta))
    pendingRef.current = next
    setLocalTemp(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (pendingRef.current !== null) {
        void callService('climate', 'set_temperature', { entity_id: ENTITY_ID, temperature: pendingRef.current })
      }
    }, 600)
  }

  function setMode(m: string) {
    if (!isOn) return
    void callService('climate', 'set_hvac_mode', { entity_id: ENTITY_ID, hvac_mode: m })
  }

  function setFan(f: string) {
    if (!isOn) return
    void callService('climate', 'set_fan_mode', { entity_id: ENTITY_ID, fan_mode: f })
  }

  function togglePower() {
    if (isOn) {
      void callService('climate', 'set_hvac_mode', { entity_id: ENTITY_ID, hvac_mode: 'off' })
    } else {
      const m = heatPump.hvacModes.includes('heat') ? 'heat' : (heatPump.hvacModes[0] ?? 'heat')
      void callService('climate', 'set_hvac_mode', { entity_id: ENTITY_ID, hvac_mode: m })
    }
  }

  const btnBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 10px', minHeight: 44, borderRadius: 10,
    fontSize: 15, textAlign: 'center' as const,
    transition: 'all 0.15s', cursor: isOn ? 'pointer' : 'default',
  }

  const colHeader = {
    fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' as const,
    textAlign: 'center' as const, paddingBottom: 8,
    borderBottom: '1px solid var(--border)',
    marginBottom: 6, color: 'var(--accent-dim)',
  }

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: 16,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Main row: dial + modes + fan */}
      <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'flex-start' }}>

        {/* Circular dial */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <svg width={D} height={D} style={{ overflow: 'visible' }}>
            {/* Background track */}
            <path d={arc(SWEEP)} fill="none" stroke="var(--border)" strokeWidth={TRACK_W} strokeLinecap="round" />
            {/* Filled arc */}
            {fillSweep > 2 && (
              <path d={arc(fillSweep)} fill="none" stroke={color} strokeWidth={TRACK_W} strokeLinecap="round" />
            )}
            {/* Handle dot */}
            {dot && isOn && (
              <circle cx={dot.x} cy={dot.y} r={9} fill="white" stroke={color} strokeWidth={2.5} />
            )}
            {/* Mode label */}
            <text x={CX} y={CY - 26} textAnchor="middle" fontSize={16} fontWeight={600} fill={color}
              style={{ fontFamily: 'inherit' }}>
              {isOn ? (MODE_LABELS[mode] ?? mode) : 'Off'}
            </text>
            {/* Set temperature */}
            <text x={CX} y={CY + 36} textAnchor="middle" fontSize={54} fontWeight={700}
              fill={isOn ? 'var(--text-primary)' : 'var(--text-dim)'}
              style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'inherit' }}>
              {isOn && displayTemp > 0 ? fmt(displayTemp) : '--'}
            </text>
          </svg>

          {/* +/- buttons — pulled up to sit just below the arc endpoints */}
          <div style={{ display: 'flex', gap: 4, marginTop: -44 }}>
            {([[-0.5, '−'], [0.5, '+']] as [number, string][]).map(([d, label]) => (
              <button key={label} onClick={() => adjustTemp(d)} style={{
                width: 52, height: 52, borderRadius: '50%',
                background: isOn ? 'var(--bg)' : 'transparent',
                border: `1px solid ${isOn ? 'var(--border)' : 'var(--text-dim)'}`,
                fontSize: 24, color: isOn ? 'var(--text-primary)' : 'var(--text-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: 0, cursor: isOn ? 'pointer' : 'default',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Mode selector */}
        <div style={{ flex: '0 0 148px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={colHeader}>Mode</div>
          {modes.map(m => {
            const active = mode === m && isOn
            return (
              <button key={m} onClick={() => setMode(m)} style={{
                ...btnBase,
                border: `1.5px solid ${active ? color : 'transparent'}`,
                background: active ? `${color}22` : 'transparent',
                color: active ? color : isOn ? 'var(--text-secondary)' : 'var(--text-dim)',
                fontWeight: active ? 600 : 400,
              }}>{MODE_LABELS[m] ?? m}</button>
            )
          })}
        </div>

        {/* Fan speed selector */}
        <div style={{ flex: '0 0 148px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={colHeader}>Fan</div>
          {Object.entries(FAN_MODE_MAP)
            .filter(([haKey]) => fanModes.length === 0 || fanModes.includes(haKey))
            .map(([haKey, label]) => {
              const active = fanMode === haKey && isOn
              return (
                <button key={haKey} onClick={() => setFan(haKey)} style={{
                  ...btnBase,
                  border: `1.5px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  background: active ? 'rgba(79,156,249,0.12)' : 'transparent',
                  color: active ? 'var(--accent)' : isOn ? 'var(--text-secondary)' : 'var(--text-dim)',
                  fontWeight: active ? 600 : 400,
                }}>{label}</button>
              )
            })}
        </div>

      </div>

      {/* Bottom row: power + transfer fan + current temp */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 12, borderTop: '1px solid var(--border)', gap: 8,
      }}>
        {/* Power button */}
        <button onClick={togglePower} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 16px', minHeight: 56, borderRadius: 12,
          background: isOn ? 'rgba(224,82,82,0.12)' : 'rgba(62,207,108,0.12)',
          border: `1.5px solid ${isOn ? 'var(--danger)' : 'var(--success)'}`,
          color: isOn ? 'var(--danger)' : 'var(--success)',
          fontSize: 16, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
        }}>
          <span style={{ fontSize: 20 }}>⏻</span>
          {isOn ? 'Turn Off' : 'Turn On'}
        </button>

        {/* Heat transfer fan status */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              fontSize: 18, fontWeight: 600, minWidth: 40, textAlign: 'right',
              color: heatTransfer.available ? 'var(--text-secondary)' : 'var(--text-dim)',
            }}>
              {heatTransfer.offTemp != null ? `${heatTransfer.offTemp}°` : '--'}
            </div>
            <button
              onClick={() => void callService('switch', heatTransfer.isOn ? 'turn_off' : 'turn_on', { entity_id: heatTransfer.entityId })}
              disabled={!heatTransfer.available}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0 14px', minHeight: 52, borderRadius: 12,
                background: heatTransfer.isOn ? 'rgba(245,166,35,0.12)' : 'transparent',
                border: `1.5px solid ${heatTransfer.isOn ? 'var(--warning)' : heatTransfer.available ? 'var(--border)' : 'var(--text-dim)'}`,
                color: heatTransfer.isOn ? 'var(--warning)' : heatTransfer.available ? 'var(--text-secondary)' : 'var(--text-dim)',
                fontSize: 15, fontWeight: heatTransfer.isOn ? 600 : 400,
                cursor: heatTransfer.available ? 'pointer' : 'default',
                opacity: heatTransfer.available ? 1 : 0.5,
              }}
            >
              <span style={{ fontSize: 18 }}>🌀</span>
              Transfer
            </button>
            <div style={{
              fontSize: 18, fontWeight: 600, minWidth: 40,
              color: heatTransfer.available ? 'var(--text-secondary)' : 'var(--text-dim)',
            }}>
              {heatTransfer.onTemp != null ? `${heatTransfer.onTemp}°` : '--'}
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
            auto-controlled
          </div>
        </div>

        {/* Current temp */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current temperature</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-secondary)' }}>
            {currentTemp > 0 ? `${currentTemp} °C` : '--'}
          </div>
        </div>
      </div>
    </div>
  )
}
