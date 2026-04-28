export const appRoutes = {
  confirmEmail: "/confirm-email" as const,
  home: "/index" as const,
  login: "/login" as const,
  profile: "/profile" as const,
  pvpCreate: "/pvp-create" as const,
  pvpJoin: "/pvp-join" as const,
  signup: "/signup" as const,
  tournamentStats: "/tournament-stats" as const,
};

export function buildPvpMatchRoute(matchId: string) {
  return `/pvp/${String(matchId || "").trim()}` as const;
}

export const rootStackScreens = [
  {
    name: "(tabs)" as const,
    options: { headerShown: false },
  },
  {
    name: "confirm-email" as const,
    options: { title: "Confirmar cuenta" },
  },
  {
    name: "login" as const,
    options: { title: "Iniciar sesion" },
  },
  {
    name: "pvp-create" as const,
    options: { title: "Crear sala" },
  },
  {
    name: "pvp-join" as const,
    options: { title: "Unirme por codigo" },
  },
  {
    name: "pvp/[matchId]" as const,
    options: { title: "Sala PvP" },
  },
  {
    name: "signup" as const,
    options: { title: "Crear cuenta" },
  },
  {
    name: "tournament-stats" as const,
    options: { title: "Stats de torneos" },
  },
];
