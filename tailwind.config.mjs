/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte,md,mdx}",
    "./src/data/**/*.json",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Pilotées par variable CSS → changeables par le visiteur.
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        "lab-dark": "#070a0f",
        "lab-card": "#0f131a",
        "lab-border": "#1c2230",
        // Néon : pilotées par variable CSS (palette changeable par le visiteur).
        "neon-cyan": "rgb(var(--neon-cyan) / <alpha-value>)",
        "neon-purple": "rgb(var(--neon-purple) / <alpha-value>)",
        "neon-green": "rgb(var(--neon-green) / <alpha-value>)",
      },
    },
  },
  /**
   * Les dégradés des cartes projet viennent du JSON (donc générés dynamiquement).
   * Tailwind ne peut pas les détecter par scan : on les "safelist" ici pour
   * garantir qu'ils existent dans le CSS final. Ce sont aussi les presets
   * proposés dans l'admin.
   */
  safelist: [
    "bg-gradient-to-br",
    "from-neon-cyan/30",
    "from-neon-purple/30",
    "from-neon-green/30",
    "to-neon-cyan/30",
    "to-neon-purple/30",
    "to-neon-green/30",
    // Couleurs de stats (générées via text-${color} dans le JSON)
    "text-neon-cyan",
    "text-neon-purple",
    "text-neon-green",
    "text-white",
  ],
};
