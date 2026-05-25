import { useState, useCallback, useRef } from 'react'

// UUID должны совпадать с прошивкой ESP32
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b'
const CHAR_MAC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8'
const CHAR_NAME_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a9'

export function useBLE() {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [savedMac, setSavedMac] = useState('')
  const [savedName, setSavedName] = useState('')
  const [bleSupported] = useState(() => !!navigator.bluetooth)

  const bleRef = useRef({
    device: null,
    server: null,
    macChar: null,
    nameChar: null
  })

  // Подключение к ESP32
  const connectToESP = useCallback(async () => {
    if (!navigator.bluetooth) {
      return { type: 'error', text: 'Bluetooth не поддерживается' }
    }

    setConnecting(true)

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [SERVICE_UUID] },
          { name: 'FuelConfig' }
        ],
        optionalServices: [SERVICE_UUID]
      })

      const server = await device.gatt.connect()
      const service = await server.getPrimaryService(SERVICE_UUID)
      const macChar = await service.getCharacteristic(CHAR_MAC_UUID)
      const nameChar = await service.getCharacteristic(CHAR_NAME_UUID)

      // Читаем текущие значения
      try {
        const macVal = await macChar.readValue()
        setSavedMac(new TextDecoder().decode(macVal))
      } catch (e) {
        setSavedMac('')
      }

      try {
        const nameVal = await nameChar.readValue()
        setSavedName(new TextDecoder().decode(nameVal))
      } catch (e) {
        setSavedName('')
      }

      bleRef.current = { device, server, macChar, nameChar }

      // Слушаем отключение
      device.addEventListener('gattserverdisconnected', () => {
        setConnected(false)
        setSavedMac('')
        setSavedName('')
        bleRef.current = { device: null, server: null, macChar: null, nameChar: null }
      })

      setConnected(true)
      setConnecting(false)

    } catch (error) {
      setConnecting(false)
      
      if (error.message?.includes('User cancelled')) {
        return { type: 'warning', text: 'Поиск отменён' }
      }
      
      return { type: 'error', text: 'Ошибка: ' + (error.message || 'неизвестная') }
    }
  }, [])

  // Отправка MAC
  const sendMac = useCallback(async (mac) => {
    const { macChar } = bleRef.current
    if (!macChar) return { type: 'error', text: 'Нет подключения' }

    // Проверка формата
    if (!/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(mac)) {
      return { type: 'error', text: 'Неверный формат MAC. Пример: AA:BB:CC:DD:EE:FF' }
    }

    try {
      const encoder = new TextEncoder()
      await macChar.writeValue(encoder.encode(mac))
      setSavedMac(mac)
      return { type: 'success', text: '✅ MAC сохранён на ESP32!' }
    } catch (error) {
      return { type: 'error', text: '❌ Ошибка отправки MAC' }
    }
  }, [])

  // Отправка имени
  const sendName = useCallback(async (name) => {
    const { nameChar } = bleRef.current
    if (!nameChar) return { type: 'error', text: 'Нет подключения' }

    const trimmed = name.trim()
    if (trimmed.length === 0 || trimmed.length > 20) {
      return { type: 'error', text: 'Название должно быть 1-20 символов' }
    }

    try {
      const encoder = new TextEncoder()
      await nameChar.writeValue(encoder.encode(trimmed))
      setSavedName(trimmed)
      return { type: 'success', text: '✅ Название сохранено на ESP32!' }
    } catch (error) {
      return { type: 'error', text: '❌ Ошибка отправки названия' }
    }
  }, [])

  // Отключение
  const disconnect = useCallback(() => {
    if (bleRef.current.server?.connected) {
      bleRef.current.server.disconnect()
    }
  }, [])

  return {
    connected,
    connecting,
    savedMac,
    savedName,
    connectToESP,
    sendMac,
    sendName,
    disconnect,
    bleSupported
  }
}