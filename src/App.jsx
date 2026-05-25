import { useState, useEffect, useCallback } from 'react'
import { useBLE } from './hooks/useBLE'
import StatusBar from './components/StatusBar'
import SensorBlock from './components/SensorBlock'
import CalibrationPage from './components/CalibrationPage'

const STORAGE_KEY = 'fuel-config-sensors'
const MAX_SENSORS = 2

const DEFAULT_SENSORS = [
  { mac: 'ef:8c:0f:04:ec:92', name: 'TD_961884' },
  { mac: 'c8:60:37:f3:42:92', name: 'TD_961893' }
]

function loadSensors() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, MAX_SENSORS)
      }
    }
  } catch {
    /* ignore */
  }
  return [DEFAULT_SENSORS[0]]
}

function App() {
  const {
    connected,
    connecting,
    calInfo,
    connectToESP,
    readSensors,
    sendMac,
    sendName,
    applyCalibration,
    disconnect,
    bleSupported
  } = useBLE()

  const [view, setView] = useState('main')
  const [sensorCount, setSensorCount] = useState(() => loadSensors().length)
  const [sensors, setSensors] = useState(loadSensors)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sensors.slice(0, sensorCount)))
  }, [sensors, sensorCount])

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [message])

  useEffect(() => {
    if (!connected) return
    readSensors().then((fromEsp) => {
      setSensors((prev) => {
        const next = [...prev]
        for (let i = 0; i < 2; i++) {
          if (fromEsp[i]?.mac || fromEsp[i]?.name) {
            next[i] = {
              mac: fromEsp[i].mac || next[i]?.mac || '',
              name: fromEsp[i].name || next[i]?.name || ''
            }
          }
        }
        return next
      })
      const count = fromEsp.filter((s) => s.mac || s.name).length
      if (count >= 2) setSensorCount(2)
    })
  }, [connected, readSensors])

  const showMessage = (result) => {
    if (result) setMessage(result)
  }

  const updateSensor = useCallback((index, field, value) => {
    setSensors((prev) => {
      const next = [...prev]
      while (next.length <= index) {
        next.push({ mac: '', name: '' })
      }
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }, [])

  const addSensor = () => {
    if (sensorCount >= MAX_SENSORS) return
    setSensors((prev) => {
      const next = [...prev]
      if (next.length < MAX_SENSORS) {
        next.push(DEFAULT_SENSORS[1] || { mac: '', name: '' })
      }
      return next
    })
    setSensorCount((c) => Math.min(c + 1, MAX_SENSORS))
  }

  const removeSensor = () => {
    if (sensorCount <= 1) return
    setSensorCount(1)
    setSensors((prev) => [prev[0]])
  }

  const handleConnect = async () => {
    const result = await connectToESP()
    showMessage(result)
  }

  const handleApplyCalibration = async (point0, point1) => {
    const result = await applyCalibration(point0, point1)
    showMessage(result)
    if (result?.type === 'success') {
      setTimeout(() => setView('main'), 1500)
    }
    return result
  }

  if (!bleSupported) {
    return (
      <div className="app">
        <div className="container">
          <h1>Датчик топлива</h1>
          <div className="status error">
            Web Bluetooth не поддерживается
            <br />
            <small>Используйте Chrome для Android</small>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'calibration') {
    return (
      <div className="app">
        <div className="container container-wide">
          <CalibrationPage
            calInfo={calInfo}
            connected={connected}
            onBack={() => setView('main')}
            onApply={handleApplyCalibration}
          />
          {message && (
            <div className={`message ${message.type}`}>{message.text}</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="container">
        <h1>Датчик топлива</h1>
        <p className="subtitle">Настройка датчиков и тарировка бака</p>

        <StatusBar connected={connected} connecting={connecting} />

        {!connected ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? 'Поиск…' : 'Найти ESP32'}
          </button>
        ) : (
          <>
            <div className="sensors-list">
              {Array.from({ length: sensorCount }, (_, i) => (
                <SensorBlock
                  key={i}
                  index={i}
                  mac={sensors[i]?.mac ?? ''}
                  name={sensors[i]?.name ?? ''}
                  connected={connected}
                  onMacChange={(v) => updateSensor(i, 'mac', v)}
                  onNameChange={(v) => updateSensor(i, 'name', v)}
                  onSaveMac={async (mac) => showMessage(await sendMac(mac, i))}
                  onSaveName={async (name) => showMessage(await sendName(name, i))}
                  onCalibrate={() => setView('calibration')}
                  canRemove={sensorCount > 1 && i === sensorCount - 1}
                  onRemove={removeSensor}
                />
              ))}
            </div>

            {sensorCount < MAX_SENSORS && (
              <button type="button" className="btn btn-add" onClick={addSensor}>
                + Добавить датчик
              </button>
            )}

            {calInfo?.valid && (
              <p className="cal-summary">
                Тарировка: полный бак ≈ {calInfo.litersAt4095.toFixed(1)} л (4095 = 100%)
              </p>
            )}

            <button type="button" className="btn btn-danger" onClick={disconnect}>
              Отключиться
            </button>
          </>
        )}

        {message && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}
      </div>
    </div>
  )
}

export default App
