export const CNT_FULL_SCALE = 4095
export const CNT_MIN = 1

/** Та же формула, что computeCalibration() в прошивке ESP32 */
export function computeCalibration(cntLo, litersLo, cntHi, litersHi) {
  if (cntHi === cntLo) {
    return { valid: false, error: 'Верхнее значение ДУТ должно быть больше нижнего' }
  }
  const slope = (litersHi - litersLo) / (cntHi - cntLo)
  const litersAt4095 = litersLo + slope * (CNT_FULL_SCALE - cntLo)
  if (litersAt4095 < litersLo) {
    return { valid: false, error: 'Расчёт даёт отрицательный объём на 100%' }
  }
  return {
    valid: true,
    cntLo,
    litersLo,
    cntHi,
    litersHi,
    litersAt4095,
    slope
  }
}

export function cntToLiters(cnt, cal) {
  if (!cal?.valid) return null
  return cal.litersLo + cal.slope * (cnt - cal.cntLo)
}

export function cntToPercent(cnt) {
  if (cnt < 0 || cnt > CNT_FULL_SCALE) return null
  return Math.round((cnt * 100 + CNT_FULL_SCALE / 2) / CNT_FULL_SCALE)
}

export function parseCalPairString(s) {
  const comma = s.indexOf(',')
  if (comma < 0) return null
  const cnt = parseInt(s.slice(0, comma), 10)
  const liters = parseFloat(s.slice(comma + 1))
  if (Number.isNaN(cnt) || Number.isNaN(liters)) return null
  if (cnt < CNT_MIN || cnt > CNT_FULL_SCALE) return null
  return { cnt, liters }
}

export function formatCalPair(cnt, liters) {
  const l = Number.isInteger(liters) ? liters : Number(liters.toFixed(1))
  return `${cnt},${l}`
}

/** Ответ CalInfo: "loCnt,loL,hiCnt,hiL,fullL" или "no cal" */
export function parseCalInfoString(s) {
  const t = s.trim()
  if (!t || t === 'no cal' || t.startsWith('ERR')) {
    return { valid: false }
  }
  const parts = t.split(',')
  if (parts.length < 5) return { valid: false }
  const cntLo = parseInt(parts[0], 10)
  const litersLo = parseFloat(parts[1])
  const cntHi = parseInt(parts[2], 10)
  const litersHi = parseFloat(parts[3])
  const litersAt4095 = parseFloat(parts[4])
  if ([cntLo, litersLo, cntHi, litersHi, litersAt4095].some(Number.isNaN)) {
    return { valid: false }
  }
  return {
    valid: true,
    cntLo,
    litersLo,
    cntHi,
    litersHi,
    litersAt4095
  }
}

export function validateCalibrationInputs(point0, point1) {
  const p0cnt = parseInt(point0.cnt, 10)
  const p0lit = parseFloat(point0.liters)
  const p1cnt = parseInt(point1.cnt, 10)
  const p1lit = parseFloat(point1.liters)

  if ([p0cnt, p0lit, p1cnt, p1lit].some(Number.isNaN)) {
    return { ok: false, text: 'Заполните все поля числами' }
  }
  if (p0cnt < CNT_MIN || p0cnt > CNT_FULL_SCALE || p1cnt < CNT_MIN || p1cnt > CNT_FULL_SCALE) {
    return { ok: false, text: `Значение ДУТ: от ${CNT_MIN} до ${CNT_FULL_SCALE}` }
  }
  if (p1cnt <= p0cnt) {
    return { ok: false, text: 'Вторая точка: ДУТ должно быть больше, чем в первой' }
  }
  if (p0lit < 0 || p1lit < 0) {
    return { ok: false, text: 'Литры не могут быть отрицательными' }
  }
  const cal = computeCalibration(p0cnt, p0lit, p1cnt, p1lit)
  if (!cal.valid) {
    return { ok: false, text: cal.error }
  }
  return { ok: true, cal }
}
