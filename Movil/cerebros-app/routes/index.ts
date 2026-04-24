export const appRoutes = {
  confirmEmail: '/confirm-email' as const,
  home: '/index' as const,
  login: '/login' as const,
  profile: '/profile' as const,
  signup: '/signup' as const,
  tournamentStats: '/tournament-stats' as const,
};

export const rootStackScreens = [
  {
    name: '(tabs)' as const,
    options: { headerShown: false },
  },
  {
    name: 'confirm-email' as const,
    options: { title: 'Confirmar cuenta' },
  },
  {
    name: 'login' as const,
    options: { title: 'Iniciar sesión' },
  },
  {
    name: 'signup' as const,
    options: { title: 'Crear cuenta' },
  },
  {
    name: 'tournament-stats' as const,
    options: { title: 'Stats de torneos' },
  },
];
