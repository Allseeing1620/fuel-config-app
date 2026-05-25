import { useState, useCallback, useRef } from 'react'
import {
  formatCalPair,
  parseCalInfoString,
  validateCalibrationInputs
} from '../utils/calibration'

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b'
const CHAR_MAC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8'
const CHAR_NAME_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a9'
const CHAR_MAC2_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26aa'
const CHAR_NAME2_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26ab'
const CHAR_CAL0_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26ac'
const CHAR_CAL1_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26ad'
const CHAR_CAL_GO_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26ae'
const CHAR_CAL_INFO_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26af'

const MAC_RE = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/

const SENSOR_BLE = [
  { mac: CHAR_MAC_UUID, name: CHAR_NAME_UUID },
  { mac: CHAR_MAC2_UUID, name: CHAR_NAME2_UUID }
]

async function readCharText(char) {
  const val = await char.readValue()
  return new TextDecoder().decode(val).trim()
}

async function getOptionalCharacteristic(service, uuid) {
  try {
    return await service.getCharacteristic(uuid)
  } catch {
    return null
  }
}

export function useBLE() {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [calInfo, setCalInfo] = useState(null)
  const [bleSupported] = useState(() => !!navigator.bluetooth)

  const bleRef = useRef({
    device: null,
    server: null,
    macChars: [null, null],
    nameChars: [null, null],
    cal0Char: null,
    cal1Char: null,
    calGoChar: null,
    calInfoChar: null
  })

  const refreshCalInfo = useCallback(async () => {
    const { calInfoChar } = bleRef.current
    if (!calInfoChar) return
    try {
      const text = await readCharText(calInfoChar)
      setCalInfo(parseCalInfoString(text))
    } catch {
      setCalInfo(null)
    }
  }, [])

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

      const macChars = await Promise.all(
        SENSOR_BLE.map((s) => getOptionalCharacteristic(service, s.mac))
      )
      const nameChars = await Promise.all(
        SENSOR_BLE.map((s) => getOptionalCharacteristic(service, s.name))
      )
      if (!macChars[0] || !nameChars[0]) {
        throw new Error('Устаревший или неполный BLE-сервис FuelConfig')
      }
      const cal0Char = await service.getCharacteristic(CHAR_CAL0_UUID)
      const cal1Char = await service.getCharacteristic(CHAR_CAL1_UUID)
      const calGoChar = await service.getCharacteristic(CHAR_CAL_GO_UUID)
      const calInfoChar = await service.getCharacteristic(CHAR_CAL_INFO_UUID)

      bleRef.current = {
        device,
        server,
        macChars,
        nameChars,
        cal0Char,
        cal1Char,
        calGoChar,
        calInfoChar
      }

      device.addEventListener('gattserverdisconnected', () => {
        setConnected(false)
        setCalInfo(null)
        bleRef.current = {
          device: null,
          server: null,
          macChars: [null, null],
          nameChars: [null, null],
          cal0Char: null,
          cal1Char: null,
          calGoChar: null,
          calInfoChar: null
        }
      })

      setConnected(true)
      setConnecting(false)
      await refreshCalInfo()
    } catch (error) {
      setConnecting(false)

      if (error.message?.includes('User cancelled')) {
        return { type: 'warning', text: 'Поиск отменён' }
      }

      return { type: 'error', text: 'Ошибка: ' + (error.message || 'неизвестная') }
    }
  }, [refreshCalInfo])

  const readSensors = useCallback(async () => {
    const { macChars, nameChars } = bleRef.current
    const out = [
      { mac: '', name: '' },
      { mac: '', name: '' }
    ]

    for (let i = 0; i < 2; i++) {
      if (!macChars[i] || !nameChars[i]) {
        continue
      }
      try {
        out[i].mac = await readCharText(macChars[i])
        out[i].name = await readCharText(nameChars[i])
      } catch {
        /* keep empty */
      }
    }
    return out
  }, [])

  const sendMac = useCallback(async (mac, sensorIndex = 0) => {
    if (sensorIndex < 0 || sensorIndex > 1) {
      return { type: 'error', text: 'Неверный номер датчика' }
    }
    const macChar = bleRef.current.macChars[sensorIndex]
    if (!macChar) {
      return {
        type: 'error',
        text:
          sensorIndex === 1
            ? 'Обновите прошивку ESP32 для настройки 2-го датчика'
            : 'Нет подключения'
      }
    }

    if (!MAC_RE.test(mac)) {
      return { type: 'error', text: 'Неверный формат MAC. Пример: AA:BB:CC:DD:EE:FF' }
    }

    try {
      const encoder = new TextEncoder()
      await macChar.writeValue(encoder.encode(mac.toLowerCase()))
      return { type: 'success', text: `MAC датчика ${sensorIndex + 1} сохранён на ESP32` }
    } catch {
      return { type: 'error', text: 'Ошибка отправки MAC' }
    }
  }, [])

  const sendName = useCallback(async (name, sensorIndex = 0) => {
    if (sensorIndex < 0 || sensorIndex > 1) {
      return { type: 'error', text: 'Неверный номер датчика' }
    }
    const nameChar = bleRef.current.nameChars[sensorIndex]
    if (!nameChar) {
      return {
        type: 'error',
        text:
          sensorIndex === 1
            ? 'Обновите прошивку ESP32 для настройки 2-го датчика'
            : 'Нет подключения'
      }
    }

    const trimmed = name.trim()
    if (trimmed.length === 0 || trimmed.length > 20) {
      return { type: 'error', text: 'Название должно быть 1–20 символов' }
    }

    try {
      const encoder = new TextEncoder()
      await nameChar.writeValue(encoder.encode(trimmed))
      return { type: 'success', text: `Название датчика ${sensorIndex + 1} сохранено на ESP32` }
    } catch {
      return { type: 'error', text: 'Ошибка отправки названия' }
    }
  }, [])

  const applyCalibration = useCallback(async (point0, point1) => {
    const { cal0Char, cal1Char, calGoChar } = bleRef.current
    if (!cal0Char || !cal1Char || !calGoChar) {
      return { type: 'error', text: 'Нет подключения' }
    }

    const check = validateCalibrationInputs(point0, point1)
    if (!check.ok) {
      return { type: 'error', text: check.text }
    }

    const { cal } = check
    const encoder = new TextEncoder()

    try {
      await cal0Char.writeValue(encoder.encode(formatCalPair(cal.cntLo, cal.litersLo)))
      await cal1Char.writeValue(encoder.encode(formatCalPair(cal.cntHi, cal.litersHi)))
      await calGoChar.writeValue(encoder.encode('1'))

      const resultText = await readCharText(calGoChar)
      if (resultText === 'ERR') {
        return { type: 'error', text: 'ESP32 отклонил тарировку (проверьте точки)' }
      }

      await refreshCalInfo()
      return {
        type: 'success',
        text: `Тарировка применена. 100% (4095) ≈ ${cal.litersAt4095.toFixed(1)} л`,
        cal
      }
    } catch (e) {
      return { type: 'error', text: 'Ошибка отправки: ' + (e.message || 'неизвестная') }
    }
  }, [refreshCalInfo])

  const disconnect = useCallback(() => {
    if (bleRef.current.server?.connected) {
      bleRef.current.server.disconnect()
    }
  }, [])

  return {
    connected,
    connecting,
    calInfo,
    connectToESP,
    readSensors,
    sendMac,
    sendName,
    applyCalibration,
    refreshCalInfo,
    disconnect,
    bleSupported
  }
}
