import { useMemo, useState } from 'react'
import {
  CNT_FULL_SCALE,
  CNT_MIN,
  cntToLiters,
  cntToPercent,
  validateCalibrationInputs
} from '../utils/calibration'

const DEFAULT_POINT0 = { cnt: '1', liters: '0' }
const DEFAULT_POINT1 = { cnt: '500', liters: '400' }

function CalibrationPage({ calInfo, connected, onBack, onApply }) {
  const [point0, setPoint0] = useState(() =>
    calInfo?.valid
      ? { cnt: String(calInfo.cntLo), liters: String(calInfo.litersLo) }
      : { ...DEFAULT_POINT0 }
  )
  const [point1, setPoint1] = useState(() =>
    calInfo?.valid
      ? { cnt: String(calInfo.cntHi), liters: String(calInfo.litersHi) }
      : { ...DEFAULT_POINT1 }
  )
  const [sending, setSending] = useState(false)

  const preview = useMemo(() => {
    const check = validateCalibrationInputs(point0, point1)
    if (!check.ok) return { ok: false, error: check.text }
    return { ok: true, cal: check.cal }
  }, [point0, point1])

  const handleApply = async () => {
    if (!preview.ok) return
    setSending(true)
    await onApply(point0, point1)
    setSending(false)
  }

  const exampleCnt = preview.ok ? Math.min(parseInt(point1.cnt, 10) + 200, CNT_FULL_SCALE) : null
  const exampleL =
    preview.ok && exampleCnt != null ? cntToLiters(exampleCnt, preview.cal) : null

  return (
    <div className="calibration-page">
      <button type="button" className="btn-back" onClick={onBack}>
        ← Назад
      </button>

      <h1>Тарировка</h1>
      <p className="subtitle">
        Две точки: показание ДУТ (1–{CNT_FULL_SCALE}) и соответствующие литры. Линейно
        считаем объём при 4095 = 100%.
      </p>

      {!connected && (
        <div className="status error">Подключитесь к ESP32 на главном экране</div>
      )}

      <section className="cal-section">
        <h3>Точка 1 — нижний уровень (пустой / минимум)</h3>
        <div className="cal-row">
          <div className="field compact">
            <label>Значение ДУТ</label>
            <input
              type="number"
              min={CNT_MIN}
              max={CNT_FULL_SCALE}
              value={point0.cnt}
              onChange={(e) => setPoint0((p) => ({ ...p, cnt: e.target.value }))}
            />
          </div>
          <div className="field compact">
            <label>Литры</label>
            <input
              type="number"
              min={0}
              step="0.1"
              value={point0.liters}
              onChange={(e) => setPoint0((p) => ({ ...p, liters: e.target.value }))}
            />
          </div>
        </div>
      </section>

      <section className="cal-section">
        <h3>Точка 2 — эталон (например, частичная заправка)</h3>
        <div className="cal-row">
          <div className="field compact">
            <label>Значение ДУТ</label>
            <input
              type="number"
              min={CNT_MIN}
              max={CNT_FULL_SCALE}
              value={point1.cnt}
              onChange={(e) => setPoint1((p) => ({ ...p, cnt: e.target.value }))}
            />
          </div>
          <div className="field compact">
            <label>Литры</label>
            <input
              type="number"
              min={0}
              step="0.1"
              value={point1.liters}
              onChange={(e) => setPoint1((p) => ({ ...p, liters: e.target.value }))}
            />
          </div>
        </div>
      </section>

      <div className={`preview-box ${preview.ok ? 'ok' : 'err'}`}>
        {preview.ok ? (
          <>
            <div className="preview-main">
              <span className="preview-label">100% (ДУТ = {CNT_FULL_SCALE})</span>
              <span className="preview-value">{preview.cal.litersAt4095.toFixed(1)} л</span>
            </div>
            {exampleCnt != null && exampleL != null && (
              <p className="preview-example">
                Пример: ДУТ {exampleCnt} → {cntToPercent(exampleCnt)}%, ≈{' '}
                {exampleL.toFixed(1)} л
              </p>
            )}
            <p className="preview-note">
              На дисплее ESP32 после тарировки показываются % и литры по этой кривой для
              обоих датчиков.
            </p>
          </>
        ) : (
          <p>{preview.error}</p>
        )}
      </div>

      {calInfo?.valid && (
        <p className="stored-cal">
          Сохранено на плате: {calInfo.cntLo}→{calInfo.litersLo} л, {calInfo.cntHi}→
          {calInfo.litersHi} л, полный бак ≈ {calInfo.litersAt4095.toFixed(1)} л
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary"
        onClick={handleApply}
        disabled={!connected || !preview.ok || sending}
      >
        {sending ? 'Отправка…' : 'Отправить тарировку на ESP32'}
      </button>
    </div>
  )
}

export default CalibrationPage
