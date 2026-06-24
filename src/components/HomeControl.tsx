import { useState } from 'react'
import type { HomeData, Scene } from '../types'
import { HeatPumpControl } from './HeatPumpControl'

interface Props {
  data: HomeData
  activateScene: (scene: string) => Promise<void>
  togglePlug: (entityId: string, on: boolean) => Promise<void>
  callService: (domain: string, service: string, data: Record<string, unknown>) => Promise<void>
}

const SCENES: { id: Scene; label: string; icon: string }[] = [
  { id: 'away', label: 'Away', icon: '🚗' },
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'bedtime', label: 'Bedtime', icon: '🌙' },
]

const PLUG_ICONS: Record<string, string> = {
  mirror_light:   '🪞',
  flower_light:   '🌸',
  big_lamp:       '💡',
  antique_lamp:   '🕯️',
  outdoor_lights: '🌙',
}

export function HomeControl({ data, activateScene, togglePlug, callService }: Props) {
  const { heatPump, plugs } = data
  const [activeScene, setActiveScene] = useState<Scene | null>(null)

  function handleScene(scene: Scene) {
    setActiveScene(scene)
    void activateScene(scene)
  }

  return (
    <div className="home-control">
      {/* Scenes */}
      <div>
        <div className="section-title">Scenes</div>
        <div className="scene-row">
          {SCENES.map((s) => (
            <button
              key={s.id}
              className={`scene-btn${activeScene === s.id ? ' active' : ''}`}
              data-scene={s.id}
              onClick={() => handleScene(s.id)}
              aria-label={`Activate ${s.label} scene`}
            >
              <span className="scene-icon">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Heat pump */}
      <div>
        <div className="section-title">Heat Pump</div>
        <HeatPumpControl heatPump={heatPump} heatTransfer={data.heatTransfer} callService={callService} />
      </div>

      {/* Smart plugs */}
      <div>
        <div className="section-title">Lights</div>
        <div className="plugs-grid">
          {plugs.map((plug) => (
            <button
              key={plug.id}
              className={`plug-btn${plug.on ? ' on' : ''}`}
              onClick={() => togglePlug(plug.entityId, plug.on)}
              aria-label={`${plug.label} is ${plug.on ? 'on' : 'off'}, tap to toggle`}
            >
              <span className="plug-icon">{PLUG_ICONS[plug.id] ?? '🔌'}</span>
              {plug.label}
              <span style={{ fontSize: 12 }}>{plug.on ? 'ON' : 'off'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
