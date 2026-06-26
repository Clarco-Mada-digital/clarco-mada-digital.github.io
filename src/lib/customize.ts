/**
 * Données du personnaliseur visiteur : combinaisons de polices et palettes
 * de couleurs. Les valeurs sont appliquées via des variables CSS
 * (--font-sans, --font-mono, --neon-cyan/purple/green) et mémorisées en
 * localStorage. Voir src/scripts/customizer.ts (logique) et le panneau.
 */

export interface FontPairing {
  id: string;
  label: string;
  sans: string;
  mono: string;
}

export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: "space",
    label: "Space",
    sans: "'Space Grotesk Variable', system-ui, sans-serif",
    mono: "'Space Mono', monospace",
  },
  {
    id: "sora",
    label: "Sora",
    sans: "'Sora Variable', system-ui, sans-serif",
    mono: "'JetBrains Mono Variable', monospace",
  },
  {
    id: "cyber",
    label: "Cyber",
    sans: "'Chakra Petch', system-ui, sans-serif",
    mono: "'IBM Plex Mono', monospace",
  },
  {
    id: "classic",
    label: "Classique",
    sans: "'Inter Variable', system-ui, sans-serif",
    mono: "'JetBrains Mono Variable', monospace",
  },
];

export interface ColorTheme {
  id: string;
  label: string;
  /** Valeurs "r g b" pour les variables CSS --neon-*. */
  cyan: string;
  purple: string;
  green: string;
}

export const COLOR_THEMES: ColorTheme[] = [
  { id: "neon", label: "Néon", cyan: "0 240 255", purple: "188 19 254", green: "0 255 157" },
  { id: "sunset", label: "Sunset", cyan: "255 138 76", purple: "255 56 129", green: "255 199 95" },
  { id: "matrix", label: "Matrix", cyan: "57 255 136", purple: "0 209 102", green: "173 255 0" },
  { id: "glacier", label: "Glacier", cyan: "86 204 242", purple: "129 140 248", green: "45 226 230" },
  { id: "fuchsia", label: "Fuchsia", cyan: "94 234 212", purple: "217 70 239", green: "244 114 182" },
];

export const DEFAULT_FONT = "space";
export const DEFAULT_THEME = "neon";

export const STORAGE = {
  fontId: "ui-font",
  fontSans: "ui-font-sans",
  fontMono: "ui-font-mono",
  themeId: "ui-palette",
  neon: "ui-neon",
};
