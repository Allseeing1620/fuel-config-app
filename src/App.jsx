import { useState, useEffect } from 'react'
import { useBLE } from './hooks/useBLE'
import StatusBar from './components/StatusBar'
import ConfigForm from './components/ConfigForm'

function App() {
  const {
    connected,
    connecting,
    savedMac,
    savedName,
    connectToESP,
    sendMac,
    sendName,
    disconnect,
    bleSupported
  } = useBLE()

  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const handleSendMac = async (mac) => {
    const result = await sendMac(mac)
    setMessage(result)
  }

  const handleSendName = async (name) => {
    const result = await sendName(name)
    setMessage(result)
  }

  if (!bleSupported) {
    return (
      <div className="app">
        <div className="container">
          <h1>⛽ Датчик топлива</h1>
          <div className="status error">
            ❌ Web Bluetooth не поддерживается<br/>
            <small>Используйте Chrome для Android</small>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="container">
        <h1>⛽ Датчик топлива</h1>
        <p className="subtitle">Настройка MAC-адреса датчика</p>

        <StatusBar connected={connected} connecting={connecting} />

        {!connected ? (
          <button 
            className="btn btn-primary" 
            onClick={connectToESP}
            disabled={connecting}
          >
            {connecting ? '⏳ Поиск...' : '🔍 Найти ESP32'}
          </button>
        ) : (
          <>
            <ConfigForm
              savedMac={savedMac}
              savedName={savedName}
              onSendMac={handleSendMac}
              onSendName={handleSendName}
            />
            <button className="btn btn-danger" onClick={disconnect}>
              🔌 Отключиться
            </button>
          </>
        )}

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}

export default App