import { useState } from 'react'

function ConfigForm({ savedMac, savedName, onSendMac, onSendName }) {
  const [mac, setMac] = useState(savedMac || '')
  const [name, setName] = useState(savedName || '')

  // Обновляем поля, когда приходят данные с ESP32
  if (savedMac && mac !== savedMac && mac === '') {
    setMac(savedMac)
  }
  if (savedName && name !== savedName && name === '') {
    setName(savedName)
  }

  return (
    <div className="config-form">
      <div className="field">
        <label>MAC-адрес датчика:</label>
        <input
          type="text"
          value={mac}
          onChange={e => setMac(e.target.value)}
          placeholder="AA:BB:CC:DD:EE:FF"
          maxLength={17}
          autoComplete="off"
        />
        <button 
          className="btn btn-primary"
          onClick={() => onSendMac(mac)}
        >
          ✅ Сохранить MAC
        </button>
      </div>

      <div className="field">
        <label>Название датчика:</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="TD_961884"
          maxLength={20}
          autoComplete="off"
        />
        <button 
          className="btn btn-primary"
          onClick={() => onSendName(name)}
        >
          ✅ Сохранить название
        </button>
      </div>
    </div>
  )
}

export default ConfigForm