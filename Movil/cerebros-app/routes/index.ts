export const appRoutes = {
  home: '/' as const,
  profile: '/profile' as const,
};

export const rootStackScreens = [
  {
    name: 'index' as const,
    options: { headerShown: false },
  },
  {
    name: 'profile' as const,
    options: { title: 'Perfil' },
  },
];
