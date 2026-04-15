export const tournamentStateOptions = [
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'PROGRAMADO', label: 'Programado' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'PAUSADO', label: 'Pausado' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

export const tournamentTypeOptions = [
  { value: 'SERIE', label: 'Serie Sudoku' },
]

export const tournamentRecurrenceOptions = [
  { value: 'NINGUNA', label: 'Sin recurrencia' },
  { value: 'DIARIA', label: 'Diaria' },
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'MENSUAL', label: 'Mensual' },
]

export const sudokuDifficultyOptions = [
  { value: '', label: 'Sin definir' },
  { value: 'Principiante', label: 'Principiante' },
  { value: 'Iniciado', label: 'Iniciado' },
  { value: 'Intermedio', label: 'Intermedio' },
  { value: 'Avanzado', label: 'Avanzado' },
  { value: 'Experto', label: 'Experto' },
  { value: 'Profesional', label: 'Profesional' },
]

const COMMON_CONFIG_KEYS = [
  'duracionMaximaMin',
  'dificultad',
  'numeroTableros',
]

const LEGACY_CONFIG_KEYS = [
  'maxParticipantes',
  'intentosMaximos',
  'pistasMaximas',
  'seedFija',
  'permitirEmpates',
  'numeroPistas',
  'pistasPermitidas',
  'tableros',
  'cantidadTableros',
]

const HIDDEN_CONFIG_KEYS = ['esOficial']

const CONFIG_ENTRY_DEFINITIONS = [
  {
    key: 'duracionMaximaMin',
    label: 'Duracion maxima',
    format: (value) => `${value} min`,
  },
  {
    key: 'dificultad',
    label: 'Dificultad',
    format: (value) => String(value),
  },
  {
    key: 'numeroTableros',
    label: 'Numero de tableros',
    format: (value) => String(value),
  },
]

const LEGACY_TOURNAMENT_TYPE_LABELS = {
  PUNTOS: 'Puntos',
  TIEMPO: 'Tiempo',
  PVP: 'PvP',
}

const TOURNAMENT_TIME_ZONE = 'America/Bogota'
const TOURNAMENT_UTC_OFFSET = '-05:00'
const TOURNAMENT_DATE_KIND_SCHEDULE = 'schedule'
const TOURNAMENT_DATE_KIND_SYSTEM = 'system'

const tournamentDateTimePartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TOURNAMENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const allowedTransitions = {
  BORRADOR: ['PROGRAMADO', 'CANCELADO'],
  PROGRAMADO: ['ACTIVO', 'PAUSADO', 'CANCELADO'],
  ACTIVO: ['PAUSADO', 'CANCELADO'],
  PAUSADO: ['PROGRAMADO', 'ACTIVO', 'CANCELADO'],
  FINALIZADO: [],
  CANCELADO: [],
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function formatLabelFromValue(value) {
  const normalized = String(value || '').trim().toUpperCase()
  const option =
    tournamentStateOptions.find((item) => item.value === normalized) ||
    tournamentTypeOptions.find((item) => item.value === normalized) ||
    tournamentRecurrenceOptions.find((item) => item.value === normalized)

  if (option) return option.label
  if (LEGACY_TOURNAMENT_TYPE_LABELS[normalized]) return LEGACY_TOURNAMENT_TYPE_LABELS[normalized]
  if (!normalized) return 'Sin definir'
  return normalized.charAt(0) + normalized.slice(1).toLowerCase()
}

export function getTournamentFormDefaults() {
  const now = new Date()
  const start = new Date(now.getTime() + 60 * 60 * 1000)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

  return {
    nombre: '',
    descripcion: '',
    esPublico: true,
    tipo: 'SERIE',
    fechaInicioLocal: toDateTimeLocal(start.toISOString()),
    fechaFinLocal: toDateTimeLocal(end.toISOString()),
    recurrencia: 'NINGUNA',
    duracionMaximaMin: '20',
    numeroTableros: '3',
    dificultad: 'Intermedio',
  }
}

function normalizeTournamentDateInput(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const withTimeSeparator = raw.includes(' ') ? raw.replace(' ', 'T') : raw
  const withExpandedTimezone = withTimeSeparator.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
  return withExpandedTimezone.replace(/\.(\d{3})\d+/, '.$1')
}

function resolveTournamentDateCandidate(normalizedValue, kind) {
  const hasExplicitTimezone = /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(normalizedValue)
  const isoWithoutZonePattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/

  if (hasExplicitTimezone || !isoWithoutZonePattern.test(normalizedValue)) {
    return normalizedValue
  }

  return kind === TOURNAMENT_DATE_KIND_SCHEDULE
    ? `${normalizedValue}${TOURNAMENT_UTC_OFFSET}`
    : `${normalizedValue}Z`
}

function formatBogotaDateTimeLocal(date) {
  const parts = tournamentDateTimePartsFormatter
    .formatToParts(date)
    .reduce((accumulator, part) => {
      if (part.type !== 'literal') {
        accumulator[part.type] = part.value
      }
      return accumulator
    }, {})

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function parseTournamentDateValue(value, options = {}) {
  const normalized = normalizeTournamentDateInput(value)
  if (!normalized) return null

  const kind =
    options.kind === TOURNAMENT_DATE_KIND_SCHEDULE
      ? TOURNAMENT_DATE_KIND_SCHEDULE
      : TOURNAMENT_DATE_KIND_SYSTEM
  const candidate = resolveTournamentDateCandidate(normalized, kind)
  const parsed = new Date(candidate)

  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export function getTournamentTimestamp(value, options = {}) {
  return parseTournamentDateValue(value, options)?.getTime() ?? 0
}

export function toDateTimeLocal(value) {
  const date = parseTournamentDateValue(value, { kind: TOURNAMENT_DATE_KIND_SCHEDULE })
  if (!date) return ''
  return formatBogotaDateTimeLocal(date)
}

export function fromDateTimeLocal(value, options = {}) {
  const raw = String(value || '').trim()
  if (!raw) return undefined

  if (options.keepOriginal && String(options.originalRaw || '').trim()) {
    return String(options.originalRaw).trim()
  }

  const localIsoNoZone = raw.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/)
  if (localIsoNoZone) return `${localIsoNoZone[0].slice(0, 16)}`

  const date = parseTournamentDateValue(raw, { kind: TOURNAMENT_DATE_KIND_SCHEDULE })
  if (!date) return undefined
  return formatBogotaDateTimeLocal(date)
}

export function formatTournamentDate(value, options = {}) {
  const raw = String(value || '').trim()
  if (!raw) return 'Sin definir'

  const date = parseTournamentDateValue(raw, options)
  if (!date) {
    return raw.replace('T', ' ')
  }

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: TOURNAMENT_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatTournamentState(value) {
  return formatLabelFromValue(value)
}

export function formatTournamentType(value) {
  return formatLabelFromValue(value)
}

export function formatTournamentRecurrence(value) {
  return formatLabelFromValue(value)
}

export function getTournamentVisibilityLabel(tournament) {
  return tournament?.esPublico === false ? 'Privado' : 'Publico'
}

export function getTournamentStatusTone(value) {
  const normalized = String(value || '').trim().toUpperCase()
  if (normalized === 'ACTIVO') return 'success'
  if (normalized === 'PROGRAMADO') return 'info'
  if (normalized === 'PAUSADO') return 'warning'
  if (normalized === 'CANCELADO') return 'danger'
  if (normalized === 'FINALIZADO') return 'muted'
  return 'draft'
}

export function getAllowedTournamentTransitions(value) {
  const normalized = String(value || '').trim().toUpperCase()
  return allowedTransitions[normalized] || []
}

export function canManageTournament(tournament, user) {
  const currentUserIds = [user?.id, user?.sub]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  const ownerId = String(tournament?.creadorId || '').trim()
  return Boolean(ownerId) && currentUserIds.includes(ownerId)
}

export function isOfficialTournament(tournament) {
  return tournament?.esOficial === true || tournament?.configuracion?.esOficial === true
}

function isOpaqueUserId(value) {
  const normalized = String(value || '').trim()
  if (!normalized) return false
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    return true
  }
  return /^[A-Za-z0-9_-]{20,}$/.test(normalized) && !/\s/.test(normalized)
}

export function getTournamentOwnerLabel(tournament, user) {
  const ownerName = String(tournament?.creadorNombre || '').trim()
  const ownerId = String(tournament?.creadorId || '').trim()
  if (ownerName && ownerName !== ownerId && !isOpaqueUserId(ownerName)) return ownerName

  if (canManageTournament(tournament, user)) return String(user?.name || '').trim() || 'Tu'

  if (!ownerId) return 'Sin creador'
  return ownerId
}

export function buildTournamentInviteLink(tournamentId, codigoAcceso = '') {
  const normalizedTournamentId = String(tournamentId || '').trim()
  if (!normalizedTournamentId) return ''

  const rawBase = import.meta.env.BASE_URL || '/'
  const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const inviteUrl = new URL(`${normalizedBase}torneos/${normalizedTournamentId}`, `${origin}/`)
  const normalizedCode = String(codigoAcceso || '').trim()

  if (normalizedCode) {
    inviteUrl.searchParams.set('codigo', normalizedCode)
  }

  return inviteUrl.toString()
}

export function splitTournamentConfig(configuracion) {
  const config = isPlainObject(configuracion) ? configuracion : {}
  const extras = {}

  const common = {
    duracionMaximaMin:
      Object.prototype.hasOwnProperty.call(config, 'duracionMaximaMin') && config.duracionMaximaMin !== null
        ? String(config.duracionMaximaMin)
        : '',
    dificultad:
      Object.prototype.hasOwnProperty.call(config, 'dificultad') && config.dificultad !== null
        ? String(config.dificultad)
        : '',
    numeroTableros:
      Object.prototype.hasOwnProperty.call(config, 'numeroTableros') && config.numeroTableros !== null
        ? String(config.numeroTableros)
        : '',
  }

  Object.entries(config).forEach(([key, value]) => {
    if (!COMMON_CONFIG_KEYS.includes(key) && !LEGACY_CONFIG_KEYS.includes(key)) {
      extras[key] = value
    }
  })

  return { common, extras }
}

export function buildTournamentConfig(commonValues, extraValues = {}) {
  const common = commonValues || {}
  const extras = isPlainObject(extraValues) ? extraValues : {}
  const config = { ...extras }
  const duracionMaximaMin = Number(common.duracionMaximaMin)
  const numeroTableros = Number(common.numeroTableros)

  if (String(common.duracionMaximaMin || '').trim() && Number.isFinite(duracionMaximaMin)) {
    config.duracionMaximaMin = duracionMaximaMin
  }
  if (String(common.dificultad || '').trim()) {
    config.dificultad = String(common.dificultad).trim()
  }
  if (String(common.numeroTableros || '').trim() && Number.isFinite(numeroTableros)) {
    config.numeroTableros = numeroTableros
  }

  return config
}

export function summarizeTournamentConfig(configuracion) {
  return describeTournamentConfig(configuracion)
    .map((item) => `${item.label}: ${item.value}`)
    .slice(0, 4)
}

function formatGenericConfigValue(value) {
  if (typeof value === 'boolean') return value ? 'Si' : 'No'
  if (value === null || value === undefined || value === '') return 'Sin definir'
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => String(item)).join(', ') : '[]'
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[objeto]'
    }
  }

  return String(value)
}

export function describeTournamentConfig(configuracion) {
  const config = isPlainObject(configuracion) ? configuracion : {}
  const entries = []

  CONFIG_ENTRY_DEFINITIONS.forEach((definition) => {
    if (!Object.prototype.hasOwnProperty.call(config, definition.key)) {
      return
    }

    const rawValue = config[definition.key]
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return
    }

    entries.push({
      key: definition.key,
      label: definition.label,
      value: definition.format(rawValue),
    })
  })

  Object.entries(config)
    .filter(([key, value]) => {
      if (COMMON_CONFIG_KEYS.includes(key)) return false
      if (HIDDEN_CONFIG_KEYS.includes(key)) return false
      if (value === undefined || value === null || value === '') return false
      return true
    })
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey, 'es'))
    .forEach(([key, value]) => {
      entries.push({
        key,
        label: key,
        value: formatGenericConfigValue(value),
      })
    })

  return entries
}

export function stringifyTournamentExtras(extras) {
  if (!isPlainObject(extras) || !Object.keys(extras).length) {
    return '{}'
  }

  try {
    return JSON.stringify(extras, null, 2)
  } catch {
    return '{}'
  }
}

export function parseTournamentExtras(text) {
  const raw = String(text || '').trim()
  if (!raw) return {}

  const parsed = JSON.parse(raw)
  if (!isPlainObject(parsed)) {
    throw new Error('La configuracion avanzada debe ser un objeto JSON.')
  }
  return parsed
}
