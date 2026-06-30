import { useState, useEffect, useCallback, type CSSProperties } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line,
} from 'recharts'

const TASKS = [
  { id: 'lamp',      emoji: '💡', label: 'Lamp off, curtains open' },
  { id: 'dressed',   emoji: '👕', label: 'Get dressed' },
  { id: 'breakfast', emoji: '🥣', label: 'Breakfast' },
  { id: 'teeth',     emoji: '🪥', label: 'Brush teeth' },
  { id: 'hair',      emoji: '💇', label: 'Brush hair' },
  { id: 'tidy',      emoji: '🧹', label: '2-minute tidy' },
  { id: 'bag',       emoji: '🎒', label: 'Bag ready' },
  { id: 'shoes',     emoji: '👟', label: 'Shoes on' },
]

const SCHOOL_HOUR = 8
const SCHOOL_MIN = 30
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function todayKey() { return new Date().toISOString().slice(0, 10) }
function dayName()  { return DAYS_FULL[new Date().getDay()] }
function formatTime(d: Date) {
  return d.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function minutesUntilSchool() {
  const now = new Date(), s = new Date(now)
  s.setHours(SCHOOL_HOUR, SCHOOL_MIN, 0, 0)
  return Math.max(0, Math.floor((s.getTime() - now.getTime()) / 60000))
}

interface DayData {
  wakeUpTime: string | null
  tasks: Record<string, boolean>
  taskTimes: Record<string, string>
  firstTaskTime: string | null
  lastTaskTime: string | null
  completed: boolean
  freeTimeMinutes: number | null
}

interface HistoryEntry extends DayData {
  dateKey: string
  dayOfWeek: string
}

// Storage layer — swap loadDay/saveDay for Supabase calls later:
//   loadDay → supabase.from('morning_days').select().eq('date_key', dateKey).single()
//   saveDay → supabase.from('morning_days').upsert({ date_key, ...data })
async function loadDay(dateKey: string): Promise<DayData | null> {
  try {
    const raw = localStorage.getItem(`mm:${dateKey}`)
    return raw ? (JSON.parse(raw) as DayData) : null
  } catch { return null }
}

async function saveDay(dateKey: string, data: DayData): Promise<void> {
  try {
    localStorage.setItem(`mm:${dateKey}`, JSON.stringify(data))
  } catch (e) { console.error('Save failed:', e) }
}

async function loadHistory(days = 14): Promise<HistoryEntry[]> {
  const candidates = Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return { key: d.toISOString().slice(0, 10), dayNum: d.getDay() }
  }).filter(({ dayNum }) => dayNum !== 0 && dayNum !== 6)

  const entries = await Promise.all(
    candidates.map(async ({ key, dayNum }) => {
      const data = await loadDay(key)
      return data?.completed ? { ...data, dateKey: key, dayOfWeek: DAYS_SHORT[dayNum] } : null
    })
  )
  return entries.filter((e): e is HistoryEntry => e !== null).reverse()
}

function emptyDay(): DayData {
  return {
    wakeUpTime: null, tasks: {}, taskTimes: {},
    firstTaskTime: null, lastTaskTime: null,
    completed: false, freeTimeMinutes: null,
  }
}

const C = {
  bg: '#0d0d12', card: '#16161f', surface: '#1e1e2a',
  accent: '#e05252', gold: '#f5a623', green: '#3ecf6c',
  greenGlow: 'rgba(62,207,108,0.25)', blue: '#4f9cf9',
  text: '#f0f0f5', muted: '#8888aa', dim: '#2a2a3a',
}

function TabBar({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexShrink: 0 }}>
      {[{ id: 'today', label: 'Today', icon: '⭐' }, { id: 'stats', label: 'Stats', icon: '📊' }].map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
          background: tab === t.id ? C.surface : 'transparent',
          color: tab === t.id ? C.text : C.muted, minHeight: 0,
          fontSize: 14, fontWeight: tab === t.id ? 700 : 400, cursor: 'pointer',
        }}>{t.icon} {t.label}</button>
      ))}
    </div>
  )
}

function Countdown() {
  const [mins, setMins] = useState(minutesUntilSchool())
  useEffect(() => {
    const t = setInterval(() => setMins(minutesUntilSchool()), 15000)
    return () => clearInterval(t)
  }, [])
  if (mins <= 0) return null
  const urgent = mins <= 15, warn = mins <= 30
  return (
    <div style={{
      background: C.card, borderRadius: 12, padding: '10px 16px', marginBottom: 14, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      border: urgent ? `1px solid ${C.accent}` : '1px solid transparent',
      boxShadow: urgent ? '0 0 12px rgba(233,69,96,0.3)' : 'none',
    }}>
      <span style={{ fontSize: 13, color: C.muted }}>🏫 School at 8:30</span>
      <span style={{
        fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        color: urgent ? C.accent : warn ? C.gold : C.green,
      }}>{mins} min</span>
    </div>
  )
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0
  const allDone = done === total
  return (
    <div style={{ marginBottom: 14, flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: C.muted }}>{allDone ? 'All done! 🎉' : `${done} of ${total} tasks`}</span>
        <span style={{ fontSize: 13 }}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} style={{ opacity: i < done ? 1 : 0.2, transition: 'opacity 0.3s' }}>⭐</span>
          ))}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: C.surface, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4, width: `${pct * 100}%`,
          background: allDone
            ? `linear-gradient(90deg, ${C.green}, ${C.gold})`
            : `linear-gradient(90deg, ${C.green}, ${C.blue})`,
          transition: 'width 0.4s ease-out',
        }} />
      </div>
    </div>
  )
}

function TaskButton({ task, isDone, isRecent, onToggle }: {
  task: { id: string; emoji: string; label: string }
  isDone: boolean
  isRecent: boolean
  onToggle: () => void
}) {
  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
      borderRadius: 14, width: '100%', minHeight: 64,
      border: isDone ? `1.5px solid rgba(0,214,143,0.25)` : `1.5px solid rgba(255,255,255,0.06)`,
      background: isDone ? 'rgba(0,214,143,0.10)' : C.surface,
      cursor: 'pointer', transition: 'all 0.2s',
      transform: isRecent ? 'scale(0.97)' : 'scale(1)',
      outline: 'none', textAlign: 'left',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        background: isDone ? C.green : 'rgba(255,255,255,0.05)',
        boxShadow: isDone ? `0 0 10px ${C.greenGlow}` : 'none',
        color: isDone ? C.bg : 'inherit',
      }}>{isDone ? '✓' : task.emoji}</div>
      <span style={{
        fontSize: 17, fontWeight: isDone ? 400 : 600, flex: 1,
        color: isDone ? C.muted : C.text,
        textDecoration: isDone ? 'line-through' : 'none',
      }}>{task.label}</span>
      {isDone && <span style={{ fontSize: 20, opacity: 0.5 }}>{task.emoji}</span>}
    </button>
  )
}

function WakeUpPrompt({ onSet }: { onSet: (time: string) => void }) {
  const now = new Date()
  const isAfter11 = now.getHours() >= 11
  const defaultH = isAfter11 ? 11 : now.getHours()
  const defaultM = isAfter11 ? 0 : Math.round(now.getMinutes() / 5) * 5 % 60
  const [h, setH] = useState(defaultH.toString())
  const [m, setM] = useState(defaultM.toString().padStart(2, '0'))

  const sel: CSSProperties = {
    background: C.surface, color: C.text, border: `1px solid ${C.dim}`,
    borderRadius: 8, padding: '8px 12px', fontSize: 20, fontWeight: 700,
    textAlign: 'center', outline: 'none', cursor: 'pointer', width: 70,
  }

  return (
    <div style={{ background: C.card, borderRadius: 14, padding: 16, marginBottom: 14, textAlign: 'center', flexShrink: 0 }}>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>⏰ What time did you wake up?</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <button
          onClick={() => onSet(`${h}:${m.padStart(2, '0')}`)}
          style={{
            background: C.green, color: C.bg, border: 'none', borderRadius: 10,
            padding: '10px 20px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            minHeight: 0,
          }}
        >Awake @</button>
        <select value={h} onChange={e => setH(e.target.value)} style={sel}>
          {[5, 6, 7, 8, 9, 10, 11].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <span style={{ fontSize: 24, fontWeight: 700, color: C.muted }}>:</span>
        <select value={m} onChange={e => setM(e.target.value)} style={sel}>
          {['00','05','10','15','20','25','30','35','40','45','50','55'].map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function Celebration({ freeTime }: { freeTime: number | null }) {
  return (
    <div style={{
      textAlign: 'center', marginTop: 16, padding: 20, borderRadius: 16, flexShrink: 0,
      background: `linear-gradient(135deg, rgba(0,214,143,0.12), rgba(245,197,24,0.12))`,
      border: `1.5px solid rgba(0,214,143,0.2)`,
    }}>
      <div style={{ fontSize: 40, marginBottom: 6 }}>🌟</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.gold }}>Mission Complete!</div>
      {freeTime !== null && freeTime > 0 && (
        <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>{freeTime} minutes of free time earned!</div>
      )}
    </div>
  )
}

function StatsView({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 16 }}>No data yet — complete some mornings first!</div>
      </div>
    )
  }

  const chartData = history.map(d => ({
    day: `${d.dayOfWeek} ${d.dateKey.slice(8)}`,
    freeTime: d.freeTimeMinutes ?? 0,
    tasksCompleted: Object.values(d.tasks).filter(Boolean).length,
    wakeUp: d.wakeUpTime
      ? parseInt(d.wakeUpTime.split(':')[0]) * 60 + parseInt(d.wakeUpTime.split(':')[1])
      : null,
  }))

  const wakeData = chartData
    .filter(d => d.wakeUp !== null)
    .map(d => ({ ...d, wakeLabel: `${Math.floor(d.wakeUp! / 60)}:${String(d.wakeUp! % 60).padStart(2, '0')}` }))

  const avgFreeTime = Math.round(chartData.reduce((s, d) => s + d.freeTime, 0) / chartData.length)
  const perfectDays = history.filter(d => Object.values(d.tasks).filter(Boolean).length === TASKS.length).length
  const avgWake = wakeData.length > 0
    ? Math.round(wakeData.reduce((s, d) => s + d.wakeUp!, 0) / wakeData.length)
    : null

  const box: CSSProperties = { flex: 1, background: C.card, borderRadius: 12, padding: '14px 10px', textAlign: 'center' }
  const tip: CSSProperties = { backgroundColor: C.card, border: `1px solid ${C.dim}`, borderRadius: 8, fontSize: 12, color: C.text }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <div style={box}>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.green }}>{perfectDays}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Perfect days</div>
        </div>
        <div style={box}>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.gold }}>{avgFreeTime}m</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Avg free time</div>
        </div>
        <div style={box}>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.blue }}>
            {avgWake !== null ? `${Math.floor(avgWake / 60)}:${String(avgWake % 60).padStart(2, '0')}` : '--'}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Avg wake-up</div>
        </div>
      </div>

      <div style={{ background: C.card, borderRadius: 14, padding: '16px 8px 8px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12, paddingLeft: 8 }}>⏱️ Free time earned (minutes)</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.dim} vertical={false} />
            <XAxis dataKey="day" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip contentStyle={tip} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="freeTime" fill={C.green} radius={[4, 4, 0, 0]} name="Free time (min)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {wakeData.length > 0 && (
        <div style={{ background: C.card, borderRadius: 14, padding: '16px 8px 8px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12, paddingLeft: 8 }}>⏰ Wake-up time trend</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={wakeData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.dim} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={['dataMin - 15', 'dataMax + 15']}
                tickFormatter={(v: number) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`}
                tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={36}
              />
              <Tooltip
                contentStyle={tip}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => {
                  const mins = typeof v === 'number' ? v : parseInt(String(v))
                  return [`${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`, 'Wake-up']
                }}
              />
              <Line type="monotone" dataKey="wakeUp" stroke={C.gold} strokeWidth={2} dot={{ fill: C.gold, r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ background: C.card, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>✅ Task completion rate</div>
        {TASKS.map(task => {
          const rate = history.length > 0
            ? history.filter(d => d.tasks[task.id]).length / history.length
            : 0
          return (
            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{task.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ height: 6, borderRadius: 3, background: C.surface, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, width: `${rate * 100}%`,
                    background: rate === 1 ? C.green : rate >= 0.8 ? C.blue : C.gold,
                  }} />
                </div>
              </div>
              <span style={{ fontSize: 12, color: C.muted, width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(rate * 100)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function MorningMission() {
  const [tab, setTab] = useState('today')
  const [dayData, setDayData] = useState<DayData>(emptyDay())
  const [now, setNow] = useState(new Date())
  const [recentlyChecked, setRecentlyChecked] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  const key = todayKey()
  const today = dayName()
  const isWeekday = !['Saturday', 'Sunday'].includes(today)

  useEffect(() => {
    void (async () => {
      const saved = await loadDay(key)
      if (saved) setDayData(saved)
      setHistory(await loadHistory(14))
      setLoading(false)
    })()
  }, [key])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(t)
  }, [])

  const persist = useCallback(async (data: DayData) => {
    setDayData(data)
    await saveDay(key, data)
  }, [key])

  const setWakeUp = (time: string) => void persist({ ...dayData, wakeUpTime: time })

  const toggleTask = async (taskId: string) => {
    const nowTime = new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', hour12: false })
    const wasDone = !!dayData.tasks[taskId]
    const newTasks = { ...dayData.tasks, [taskId]: !wasDone }
    const newTaskTimes = { ...dayData.taskTimes }
    if (!wasDone) { newTaskTimes[taskId] = nowTime } else { delete newTaskTimes[taskId] }

    const completedTimes = Object.values(newTaskTimes)
    const allDone = TASKS.every(t => newTasks[t.id])

    const updated: DayData = {
      ...dayData, tasks: newTasks, taskTimes: newTaskTimes,
      firstTaskTime: completedTimes.length > 0 ? [...completedTimes].sort()[0] : null,
      lastTaskTime: allDone ? nowTime : null,
      completed: allDone,
      freeTimeMinutes: allDone ? minutesUntilSchool() : null,
    }

    setRecentlyChecked(taskId)
    setTimeout(() => setRecentlyChecked(null), 500)
    await persist(updated)
    if (allDone) setHistory(await loadHistory(14))
  }

  const resetDay = () => void persist(emptyDay())

  const doneCount = TASKS.filter(t => dayData.tasks[t.id]).length
  const allDone = doneCount === TASKS.length

  if (loading) return (
    <div style={{ height: '100%', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.muted }}>Loading...</div>
    </div>
  )

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: `linear-gradient(135deg, ${C.bg} 0%, #16213e 100%)`,
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      color: C.text, userSelect: 'none',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 12, flexShrink: 0 }}>
        <div style={{ fontSize: 13, color: C.muted, letterSpacing: 1, textTransform: 'uppercase' }}>
          {today} · {formatTime(now)}
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 800, margin: '2px 0 0',
          background: `linear-gradient(90deg, ${C.gold}, #ff9a56)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Morning Mission ⭐</h1>
      </div>

      <TabBar tab={tab} setTab={setTab} />

      {tab === 'today' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!dayData.wakeUpTime ? (
            <WakeUpPrompt onSet={setWakeUp} />
          ) : (
            <div style={{
              background: C.card, borderRadius: 12, padding: '8px 16px', marginBottom: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 13, color: C.muted }}>⏰ Woke up at</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.blue }}>{dayData.wakeUpTime}</span>
            </div>
          )}

          {isWeekday && !allDone && <Countdown />}
          <ProgressBar done={doneCount} total={TASKS.length} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflow: 'hidden' }}>
            {TASKS.map(task => (
              <TaskButton
                key={task.id}
                task={task}
                isDone={!!dayData.tasks[task.id]}
                isRecent={recentlyChecked === task.id}
                onToggle={() => void toggleTask(task.id)}
              />
            ))}
          </div>

          {allDone && <Celebration freeTime={dayData.freeTimeMinutes} />}

          <div style={{ textAlign: 'center', marginTop: 12, flexShrink: 0 }}>
            <button onClick={resetDay} style={{
              background: 'none', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8,
              color: C.muted, fontSize: 12, padding: '8px 20px', cursor: 'pointer', minHeight: 0,
            }}>Reset today</button>
          </div>
        </div>
      ) : (
        <StatsView history={history} />
      )}
    </div>
  )
}
