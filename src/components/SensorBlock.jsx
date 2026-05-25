import { useEffect, useState } from 'react'

function SensorBlock({
  index,
  mac,
  name,
  connected,
  onMacChange,
  onNameChange,
  onSaveMac,
  onSaveName,
  onCalibrate,
  canRemove,
  onRemove
}) {
  const [localMac, setLocalMac] = useState(mac)
  const [localName, setLocalName] = useState(name)

  useEffect(() => {
    setLocalMac(mac)
  }, [mac])

  useEffect(() => {
    setLocalName(name)
  }, [name])

  const handleMacChange = (v) => {
    setLocalMac(v)
    onMacChange(v)
  }

  const handleNameChange = (v) => {
    setLocalName(v)
    onNameChange(v)
  }

  return (
    <div className="sensor-block">
      <div className="sensor-block-header">
        <h2>Датчик {index + 1}</h2>
        {canRemove && (
          <button type="button" className="btn-icon" onClick={onRemove} title="Убрать датчик">
            −
          </button>
        )}
      </div>

      <div className="field">
        <label>MAC-адрес</label>
        <input
          type="text"
          value={localMac}
          onChange={(e) => handleMacChange(e.target.value)}
          placeholder="AA:BB:CC:DD:EE:FF"
          maxLength={17}
          autoComplete="off"
          disabled={!connected}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onSaveMac(localMac)}
          disabled={!connected}
        >
          Сохранить MAC
        </button>
      </div>

      <div className="field">
        <label>Название</label>
        <input
          type="text"
          value={localName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="TD_961884"
          maxLength={20}
          autoComplete="off"
          disabled={!connected}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onSaveName(localName)}
          disabled={!connected}
        >
          Сохранить название
        </button>
      </div>

      <button
        type="button"
        className="btn btn-outline"
        onClick={onCalibrate}
        disabled={!connected}
      >
        Тарировка бака
      </button>
    </div>
  )
}

export default SensorBlock
