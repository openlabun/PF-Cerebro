import { useEffect, useState } from 'react'
import {
  buildTournamentConfig,
  fromDateTimeLocal,
  getTournamentFormDefaults,
  parseTournamentExtras,
  splitTournamentConfig,
  stringifyTournamentExtras,
  sudokuDifficultyOptions,
  toDateTimeLocal,
  tournamentRecurrenceOptions,
  tournamentTypeOptions,
} from '../lib/tournaments.js'

function buildInitialFormState(initialTournament) {
  const defaults = getTournamentFormDefaults()

  if (!initialTournament) {
    return {
      ...defaults,
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
    tipo: String(initialTournament.tipo || 'PUNTOS').toUpperCase(),
    fechaInicioLocal: toDateTimeLocal(initialTournament.fechaInicio) || defaults.fechaInicioLocal,
    fechaFinLocal: toDateTimeLocal(initialTournament.fechaFin) || defaults.fechaFinLocal,
    recurrencia: String(initialTournament.recurrencia || 'NINGUNA').toUpperCase(),
    maxParticipantes: common.maxParticipantes,
    duracionMaximaMin: common.duracionMaximaMin,
    intentosMaximos: common.intentosMaximos,
    pistasMaximas: common.pistasMaximas,
    dificultad: common.dificultad,
    seedFija: common.seedFija,
    permitirEmpates: common.permitirEmpates,
    advancedConfigText: stringifyTournamentExtras(extras),
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

    if (!nombre) {
      setErrorMessage('El torneo necesita un nombre.')
      return
    }

    if (!descripcion) {
      setErrorMessage('El torneo necesita una descripcion.')
      return
    }

    let extraConfig = {}
    try {
      extraConfig = parseTournamentExtras(formData.advancedConfigText)
    } catch (error) {
      setErrorMessage(error.message || 'La configuracion avanzada no es valida.')
      return
    }

    const payload = {
      nombre,
      descripcion,
      esPublico: Boolean(formData.esPublico),
      tipo: String(formData.tipo || 'PUNTOS').trim().toUpperCase(),
      fechaInicio: fromDateTimeLocal(formData.fechaInicioLocal, {
        keepOriginal: !formData.fechaInicioDirty,
        originalRaw: formData.originalFechaInicioRaw,
      }),
      fechaFin: fromDateTimeLocal(formData.fechaFinLocal, {
        keepOriginal: !formData.fechaFinDirty,
        originalRaw: formData.originalFechaFinRaw,
      }),
      recurrencia: String(formData.recurrencia || 'NINGUNA').trim().toUpperCase(),
      configuracion: buildTournamentConfig(
        {
          maxParticipantes: formData.maxParticipantes,
          duracionMaximaMin: formData.duracionMaximaMin,
          intentosMaximos: formData.intentosMaximos,
          pistasMaximas: formData.pistasMaximas,
          dificultad: formData.dificultad,
          seedFija: formData.seedFija,
          permitirEmpates: formData.permitirEmpates,
        },
        extraConfig,
      ),
    }

    const fechaInicio = new Date(payload.fechaInicio || '')
    const fechaFin = new Date(payload.fechaFin || '')

    if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFin.getTime())) {
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
            placeholder="Ej. Copa relampago de Sudoku"
            disabled={busy}
            required
          />
        </label>

        <label className="auth-field">
          <span>Tipo</span>
          <select name="tipo" value={formData.tipo} onChange={handleInputChange} disabled={busy}>
            {tournamentTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

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
              : 'El backend generara un codigo de acceso automaticamente.'}
          </small>
        </div>
      </div>

      <div className="tournament-form-section">
        <div className="section-heading tournament-inline-heading">
          <div>
            <p className="section-kicker">Reglas base</p>
            <h3>{isEditMode ? 'Ajusta la configuracion del torneo' : 'Define como se juega'}</h3>
          </div>
        </div>

        <div className="tournament-form-grid">
          <label className="auth-field">
            <span>Maximo de participantes</span>
            <input
              type="number"
              min="1"
              step="1"
              name="maxParticipantes"
              value={formData.maxParticipantes}
              onChange={handleInputChange}
              placeholder="Ej. 32"
              disabled={busy}
            />
          </label>

          <label className="auth-field">
            <span>Duracion maxima (min)</span>
            <input
              type="number"
              min="1"
              step="1"
              name="duracionMaximaMin"
              value={formData.duracionMaximaMin}
              onChange={handleInputChange}
              placeholder="Ej. 15"
              disabled={busy}
            />
          </label>

          <label className="auth-field">
            <span>Intentos maximos</span>
            <input
              type="number"
              min="1"
              step="1"
              name="intentosMaximos"
              value={formData.intentosMaximos}
              onChange={handleInputChange}
              placeholder="Ej. 3"
              disabled={busy}
            />
          </label>

          <label className="auth-field">
            <span>Pistas maximas</span>
            <input
              type="number"
              min="0"
              step="1"
              name="pistasMaximas"
              value={formData.pistasMaximas}
              onChange={handleInputChange}
              placeholder="Ej. 2"
              disabled={busy}
            />
          </label>

          <label className="auth-field">
            <span>Dificultad sugerida</span>
            <select
              name="dificultad"
              value={formData.dificultad}
              onChange={handleInputChange}
              disabled={busy}
            >
              {sudokuDifficultyOptions.map((option) => (
                <option key={option.value || 'empty'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="auth-field">
            <span>Seed fija</span>
            <input
              type="text"
              name="seedFija"
              value={formData.seedFija}
              onChange={handleInputChange}
              placeholder="Opcional"
              disabled={busy}
            />
          </label>

          <label className="auth-field">
            <span>Permitir empates</span>
            <select
              name="permitirEmpates"
              value={formData.permitirEmpates}
              onChange={handleInputChange}
              disabled={busy}
            >
              <option value="">Sin definir</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
          </label>

          <label className="auth-field tournament-form-field-full">
            <span>Configuracion avanzada (JSON)</span>
            <textarea
              name="advancedConfigText"
              value={formData.advancedConfigText}
              onChange={handleInputChange}
              rows={7}
              spellCheck="false"
              disabled={busy}
              placeholder='{"premio":"Insignia especial"}'
            />
          </label>
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
