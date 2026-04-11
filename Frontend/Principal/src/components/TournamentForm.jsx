import { useEffect, useState } from 'react'
import {
  buildTournamentConfig,
  fromDateTimeLocal,
  getTournamentFormDefaults,
  parseTournamentDateValue,
  splitTournamentConfig,
  sudokuDifficultyOptions,
  toDateTimeLocal,
  tournamentRecurrenceOptions,
} from '../lib/tournaments.js'

function buildInitialFormState(initialTournament) {
  const defaults = getTournamentFormDefaults()

  if (!initialTournament) {
    return {
      ...defaults,
      configExtras: {},
      originalFechaInicioRaw: '',
      originalFechaFinRaw: '',
      fechaInicioDirty: false,
      fechaFinDirty: false,
    }
  }

  const { common, extras } = splitTournamentConfig(initialTournament.configuracion)

  return {
    nombre: String(initialTournament.nombre || ''),
    descripcion: String(initialTournament.descripcion || ''),
    esPublico: initialTournament.esPublico !== false,
    tipo: 'SERIE',
    fechaInicioLocal: toDateTimeLocal(initialTournament.fechaInicio) || defaults.fechaInicioLocal,
    fechaFinLocal: toDateTimeLocal(initialTournament.fechaFin) || defaults.fechaFinLocal,
    recurrencia: String(initialTournament.recurrencia || 'NINGUNA').toUpperCase(),
    duracionMaximaMin: common.duracionMaximaMin || defaults.duracionMaximaMin,
    numeroTableros: common.numeroTableros || defaults.numeroTableros,
    dificultad: common.dificultad || defaults.dificultad,
    configExtras: extras,
    originalFechaInicioRaw: String(initialTournament.fechaInicio || ''),
    originalFechaFinRaw: String(initialTournament.fechaFin || ''),
    fechaInicioDirty: false,
    fechaFinDirty: false,
  }
}

function TournamentForm({
  mode = 'create',
  initialTournament = null,
  busy = false,
  submitLabel = 'Guardar torneo',
  onSubmit,
}) {
  const [formData, setFormData] = useState(() => buildInitialFormState(initialTournament))
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setFormData(buildInitialFormState(initialTournament))
    setErrorMessage('')
  }, [initialTournament])

  function handleInputChange(event) {
    const { name, type, checked, value } = event.target
    const nextValue = type === 'checkbox' ? checked : value

    setFormData((current) => ({
      ...current,
      [name]: nextValue,
      ...(name === 'fechaInicioLocal' ? { fechaInicioDirty: true } : null),
      ...(name === 'fechaFinLocal' ? { fechaFinDirty: true } : null),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    const nombre = String(formData.nombre || '').trim()
    const descripcion = String(formData.descripcion || '').trim()
    const duracionMaximaMin = Number(formData.duracionMaximaMin)
    const numeroTableros = Number(formData.numeroTableros)
    const dificultad = String(formData.dificultad || '').trim()

    if (!nombre) {
      setErrorMessage('El torneo necesita un nombre.')
      return
    }

    if (!descripcion) {
      setErrorMessage('El torneo necesita una descripción.')
      return
    }

    if (!Number.isFinite(duracionMaximaMin) || duracionMaximaMin <= 0) {
      setErrorMessage('Debes definir una duracion maxima valida en minutos.')
      return
    }

    if (!Number.isFinite(numeroTableros) || numeroTableros <= 0) {
      setErrorMessage('Debes definir una cantidad valida de tableros.')
      return
    }

    if (!dificultad) {
      setErrorMessage('Debes seleccionar una dificultad para la serie.')
      return
    }

    const payload = {
      nombre,
      descripcion,
      esPublico: Boolean(formData.esPublico),
      tipo: 'SERIE',
      fechaInicio: fromDateTimeLocal(formData.fechaInicioLocal, {
        keepOriginal: !formData.fechaInicioDirty,
        originalRaw: formData.originalFechaInicioRaw,
      }),
      fechaFin: fromDateTimeLocal(formData.fechaFinLocal, {
        keepOriginal: !formData.fechaFinDirty,
        originalRaw: formData.originalFechaFinRaw,
      }),
      recurrencia: String(formData.recurrencia || 'NINGUNA').trim().toUpperCase(),
      configuracion: buildTournamentConfig({
        duracionMaximaMin: formData.duracionMaximaMin,
        numeroTableros: formData.numeroTableros,
        dificultad: formData.dificultad,
      }, formData.configExtras),
    }

    const fechaInicio = parseTournamentDateValue(payload.fechaInicio, { kind: 'schedule' })
    const fechaFin = parseTournamentDateValue(payload.fechaFin, { kind: 'schedule' })

    if (!fechaInicio || !fechaFin) {
      setErrorMessage('Las fechas del torneo no son validas.')
      return
    }

    if (fechaFin <= fechaInicio) {
      setErrorMessage('La fecha de fin debe ser posterior a la fecha de inicio.')
      return
    }

    try {
      await onSubmit(payload)
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo guardar el torneo.')
    }
  }

  const isEditMode = mode === 'edit'

  return (
    <form className="tournament-form" onSubmit={handleSubmit}>
      <div className="tournament-form-grid">
        <label className="auth-field">
          <span>Nombre</span>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleInputChange}
            placeholder="Ej. Serie relampago de Sudoku"
            disabled={busy}
            required
          />
        </label>

        <div className="auth-field">
          <span>Formato</span>
          <div className="tournament-static-field">Serie Sudoku por tiempo total</div>
        </div>

        <label className="auth-field tournament-form-field-full">
          <span>Descripcion</span>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleInputChange}
            placeholder="Describe la dinamica, premio o reglas del torneo."
            disabled={busy}
            rows={4}
            required
          />
        </label>

        <label className="auth-field">
          <span>Fecha de inicio</span>
          <input
            type="datetime-local"
            name="fechaInicioLocal"
            value={formData.fechaInicioLocal}
            onChange={handleInputChange}
            disabled={busy}
            required
          />
        </label>

        <label className="auth-field">
          <span>Fecha de fin</span>
          <input
            type="datetime-local"
            name="fechaFinLocal"
            value={formData.fechaFinLocal}
            onChange={handleInputChange}
            disabled={busy}
            required
          />
        </label>

        <label className="auth-field">
          <span>Recurrencia</span>
          <select
            name="recurrencia"
            value={formData.recurrencia}
            onChange={handleInputChange}
            disabled={busy}
          >
            {tournamentRecurrenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="auth-field tournament-visibility-toggle">
          <span>Visibilidad</span>
          <div className="tournament-toggle-row">
            <input
              id={`tournament-public-${mode}`}
              type="checkbox"
              name="esPublico"
              checked={formData.esPublico}
              onChange={handleInputChange}
              disabled={busy}
            />
            <label htmlFor={`tournament-public-${mode}`}>
              {formData.esPublico ? 'Torneo publico' : 'Torneo privado'}
            </label>
          </div>
          <small>
            {formData.esPublico
              ? 'Cualquier usuario autenticado puede inscribirse.'
              : 'El backend generará un código de acceso automáticamente.'}
          </small>
        </div>
      </div>

      <div className="tournament-form-section">
        <div className="section-heading tournament-inline-heading">
          <div>
            <p className="section-kicker">Reglas base</p>
            <h3>{isEditMode ? 'Ajusta la serie oficial' : 'Define la serie oficial'}</h3>
          </div>
        </div>

        <div className="tournament-form-grid">
          <label className="auth-field">
            <span>Duracion maxima (min)</span>
            <input
              type="number"
              min="1"
              step="1"
              name="duracionMaximaMin"
              value={formData.duracionMaximaMin}
              onChange={handleInputChange}
              placeholder="Ej. 20"
              disabled={busy}
              required
            />
          </label>

          <label className="auth-field">
            <span>Numero de tableros</span>
            <input
              type="number"
              min="1"
              step="1"
              name="numeroTableros"
              value={formData.numeroTableros}
              onChange={handleInputChange}
              placeholder="Ej. 3"
              disabled={busy}
              required
            />
          </label>

          <label className="auth-field">
            <span>Dificultad</span>
            <select
              name="dificultad"
              value={formData.dificultad}
              onChange={handleInputChange}
              disabled={busy}
              required
            >
              {sudokuDifficultyOptions
                .filter((option) => option.value)
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          </label>

          <div className="auth-field tournament-form-field-full">
            <span>Reglas fijas</span>
            <div className="tournament-static-field tournament-static-field--stacked">
              <strong>Todos juegan la misma serie de Sudokus.</strong>
              <span>Las pistas estan deshabilitadas.</span>
              <span>No se configura límite de participantes en esta versión.</span>
            </div>
          </div>
        </div>
      </div>

      {errorMessage ? <p className="status error">{errorMessage}</p> : null}

      <div className="tournament-form-actions">
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Guardando...' : submitLabel}
        </button>
        <button
          className="btn ghost"
          type="button"
          disabled={busy}
          onClick={() => {
            setFormData(buildInitialFormState(initialTournament))
            setErrorMessage('')
          }}
        >
          Restablecer
        </button>
      </div>
    </form>
  )
}

export default TournamentForm
