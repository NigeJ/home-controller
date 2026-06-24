import { useState, lazy, Suspense } from 'react'
import { Header } from './components/Header'
import { HomeControl } from './components/HomeControl'
import { useHomeAssistant } from './hooks/useHomeAssistant'
import './index.css'

// Recharts (used only in MorningMission stats) is large — lazy load so the main bundle stays small
const MorningMission = lazy(() =>
  import('./components/MorningMission').then(m => ({ default: m.MorningMission }))
)

type Tab = 'home' | 'morning'

export function App() {
  const [tab, setTab] = useState<Tab>('home')
  const { data, haError, activateScene, togglePlug, callService } = useHomeAssistant()

  return (
    <div className="app">
      <Header data={data} />

      {haError && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: 'rgba(224,82,82,0.92)', color: '#fff',
          fontSize: 14, fontWeight: 600, textAlign: 'center',
          padding: '10px 16px', zIndex: 200,
        }}>
          ⚠ {haError}
        </div>
      )}

      <main className="tab-content">
        {tab === 'home' ? (
          <HomeControl
            data={data}
            activateScene={activateScene}
            togglePlug={togglePlug}
            callService={callService}
          />
        ) : (
          <Suspense fallback={
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
              Loading…
            </div>
          }>
            <MorningMission />
          </Suspense>
        )}
      </main>

      <nav className="tab-bar">
        <button
          className={`tab-btn${tab === 'home' ? ' active' : ''}`}
          onClick={() => setTab('home')}
          aria-label="Home Control"
        >
          <span className="tab-icon">🏠</span>
          Home Control
        </button>
        <button
          className={`tab-btn${tab === 'morning' ? ' active' : ''}`}
          onClick={() => setTab('morning')}
          aria-label="Morning Mission"
        >
          <span className="tab-icon">🌅</span>
          Morning Mission
        </button>
      </nav>
    </div>
  )
}
