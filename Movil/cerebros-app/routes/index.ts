export const appRoutes = {
  home: '/index' as const,
  login: '/login' as const,
  profile: '/profile' as const,
  signup: '/signup' as const,
};

export const rootStackScreens = [
  {
    name: '(tabs)' as const,
    options: { headerShown: false },
  },
  {
    name: 'login' as const,
    options: { title: 'Iniciar sesion' },
  },
  {
    name: 'signup' as const,
    options: { title: 'Crear cuenta' },
  },
];
