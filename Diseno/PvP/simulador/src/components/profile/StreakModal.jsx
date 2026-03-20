import { useState } from 'react'

function StreakModal({ show, onClose, streakDays }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  if (!show) return null

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  const month = currentMonth.getMonth()
  const year = currentMonth.getFullYear()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7

  // Generate synthetic streak dates (last N days including today)
  const streakDates = new Set()
  const now = new Date()
  for (let i = 0; i < streakDays; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    streakDates.add(ymd)
  }

  const calendarDays = []

  // Empty cells for offset
  for (let i = 0; i < startOffset; i++) {
    calendarDays.push(null)
  }

  // Days of month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    calendarDays.push({
      day,
      hasActivity: streakDates.has(ymd),
    })
  }

  const handlePrevMonth = () => {
    if (month === 0) return
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    if (month === 11) return
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  return (
    <div id="streak-modal" className="picker-modal" aria-hidden={!show}>
      <div className="picker-backdrop" data-close-picker="streak" onClick={onClose}></div>
      <div className="picker-card" role="dialog" aria-modal="true" aria-labelledby="streak-modal-title">
        <button
          type="button"
          className="picker-x"
          data-close-picker="streak"
          aria-label="Cerrar"
          onClick={onClose}
        >
          ✖
        </button>
        <h3 id="streak-modal-title">Racha de juego</h3>
        <p className="badge-help">Días resaltados = días con actividad de racha en este año.</p>

        <div className="calendar-toolbar" aria-label="Cambiar mes de calendario">
          <button
            type="button"
            id="streak-prev-month"
            className="chip"
            onClick={handlePrevMonth}
            disabled={month === 0}
          >
            ◀
          </button>
          <strong id="streak-month-label">
            {monthNames[month]} {year}
          </strong>
          <button
            type="button"
            id="streak-next-month"
            className="chip"
            onClick={handleNextMonth}
            disabled={month === 11}
          >
            ▶
          </button>
        </div>

        <div className="calendar-weekdays" aria-hidden="true">
          <span>L</span>
          <span>M</span>
          <span>X</span>
          <span>J</span>
          <span>V</span>
          <span>S</span>
          <span>D</span>
        </div>

        <div className="streak-calendar" id="streak-calendar">
          {calendarDays.map((dayObj, index) =>
            dayObj === null ? (
              <div key={`empty-${index}`} className="calendar-day empty"></div>
            ) : (
              <div
                key={`day-${dayObj.day}`}
                className={`calendar-day ${dayObj.hasActivity ? 'active' : ''}`}
              >
                {dayObj.day}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  )
}

export default StreakModal
