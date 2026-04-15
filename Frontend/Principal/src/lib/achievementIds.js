export const ACHIEVEMENT_KEY_ID_MAP = Object.freeze({
  'first-game': 'jNVlXBxVZ4Ik',
  'five-games': 'eKdjK4OKd_qV',
  'ten-games': '_8uXFa1YZV-d',
  'score-over-500': 'pLHLX9-29oIY',
})

export const ACHIEVEMENT_ID_KEY_MAP = Object.freeze(
  Object.fromEntries(
    Object.entries(ACHIEVEMENT_KEY_ID_MAP).map(([key, id]) => [id, key]),
  ),
)
