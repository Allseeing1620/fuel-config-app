function StatusBar({ connected, connecting }) {
  if (connecting) {
    return (
      <div className="status scanning">
        ⏳ Поиск ESP32...
      </div>
    )
  }

  if (connected) {
    return (
      <div className="status connected">
        ✅ Подключено к ESP32
      </div>
    )
  }

  return (
    <div className="status disconnected">
      ● Не подключено
    </div>
  )
}

export default StatusBar