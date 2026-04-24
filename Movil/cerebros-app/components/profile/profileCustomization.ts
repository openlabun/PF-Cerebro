export const profileAvatarOptions = ["♔", "♕", "♖", "♗", "♘", "♙"] as const;

export type ProfileAvatar = (typeof profileAvatarOptions)[number];

export const profileFrameOptions = [
  { key: "frame-royal", label: "Real", minStreak: 0 },
  { key: "frame-arcane", label: "Arcano", minStreak: 0 },
  { key: "frame-neon", label: "Neon", minStreak: 0 },
  { key: "frame-ember", label: "Ascua", minStreak: 0 },
  { key: "frame-ice", label: "Hielo", minStreak: 0 },
  { key: "frame-inferno", label: "Inferno", minStreak: 11 },
  { key: "frame-bronze", label: "Bronce", minStreak: 0 },
  { key: "frame-silver", label: "Plata", minStreak: 0 },
  { key: "frame-gold", label: "Oro", minStreak: 0 },
  { key: "frame-platinum", label: "Platino", minStreak: 0 },
] as const;

export type ProfileFrameKey = (typeof profileFrameOptions)[number]["key"];

type GradientPalette = readonly [string, string, ...string[]];

export const profileFramePalette: Record<ProfileFrameKey, GradientPalette> = {
  "frame-royal": ["#ffcc66", "#7f8de6", "#38d1ff"],
  "frame-arcane": ["#9b6bff", "#3ed4ff"],
  "frame-neon": ["#00d4ff", "#00ffa3"],
  "frame-ember": ["#ff9966", "#ff5e62"],
  "frame-ice": ["#d4fcff", "#8ec5fc"],
  "frame-inferno": ["#ffe08a", "#ff9a3d", "#ff5e2f", "#5a1a00"],
  "frame-bronze": ["#a67c52", "#c0a084"],
  "frame-silver": ["#c0c0c0", "#a8a8a8"],
  "frame-gold": ["#ffd700", "#e6b800"],
  "frame-platinum": ["#e5e4e2", "#c9c9c9"],
};
