/**
 * Catalogue des templates de CV : uniquement les métadonnées (libellé,
 * couleur, mini-aperçu SVG) affichées dans la modale.
 *
 * Volontairement séparé de `cv.ts` : la modale a besoin de cette liste au
 * chargement de la page, alors que le générateur PDF (≈1400 lignes + pdfmake)
 * n'est utile qu'au clic sur « Télécharger ». Garder les deux dans le même
 * fichier ferait entrer tout le générateur dans le bundle initial.
 */

export interface CvTemplate {
  id: string;
  label: string;
  description: string;
  color: string; // couleur d'accent pour l'aperçu
  /** Mini-aperçu SVG (viewBox 0 0 60 72) affiché dans la modale. */
  preview: string;
}

/** Aperçus SVG compacts : chaque style montre sa structure (sidebar, bandes, blocs). */
const P = {
  box: (x: number, y: number, w: number, h: number, fill: string, rx = 0) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`,
  line: (x: number, y: number, w: number, fill: string, h = 3) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>`,
  dot: (x: number, y: number, r: number, fill: string) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`,
};

export const CV_TEMPLATES: CvTemplate[] = [
  {
    id: "elegant",
    label: "Élégant",
    description: "Sidebar sombre + photo, sobre et pro",
    color: "#0d9488",
    preview: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72">${P.box(0, 0, 60, 72, "#fafafa")}${P.box(0, 0, 17, 72, "#2b2d42")}${P.dot(8.5, 11, 5, "#0d9488")}${P.line(20, 6, 26, "#1f2937")}${P.line(20, 12, 18, "#9ca3af", 2)}${P.line(20, 25, 33, "#e5e7eb")}${P.line(20, 32, 33, "#e5e7eb")}${P.line(20, 39, 33, "#e5e7eb")}${P.line(20, 46, 24, "#e5e7eb")}</svg>`,
  },
  {
    id: "vibrant",
    label: "Vibrant",
    description: "Grand bandeau coloré + photo ronde",
    color: "#4f46e5",
    preview: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72">${P.box(0, 0, 60, 72, "#fafafa")}${P.box(0, 0, 60, 20, "#4f46e5")}${P.dot(30, 20, 8, "#ffffff")}${P.line(12, 30, 36, "#1f2937")}${P.line(18, 37, 24, "#9ca3af", 2)}${P.line(10, 46, 40, "#e5e7eb")}${P.line(10, 53, 40, "#e5e7eb")}${P.line(10, 60, 28, "#e5e7eb")}</svg>`,
  },
  {
    id: "solaire",
    label: "Solaire",
    description: "Blocs encadrés, jaune audacieux",
    color: "#d9a509",
    preview: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72">${P.box(0, 0, 60, 72, "#fafafa")}${P.box(0, 0, 17, 72, "#f59e0b")}${P.dot(8.5, 10, 5, "#fff")}${P.box(19, 4, 38, 8, "#d9a509", 2)}${P.box(19, 18, 38, 12, "#fff", 2)}${P.line(21, 20, 30, "#d9a509", 2)}${P.box(19, 34, 38, 16, "#fff", 2)}${P.line(21, 36, 30, "#d9a509", 2)}${P.box(19, 54, 38, 14, "#fff", 2)}</svg>`,
  },
  {
    id: "coton",
    label: "Coton",
    description: "Bandeau sable + sidebar crème, doux",
    color: "#d9b5a3",
    preview: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72">${P.box(0, 0, 60, 72, "#fff")}${P.box(0, 0, 60, 13, "#d9b5a3")}${P.box(0, 13, 15, 59, "#f8e7df")}${P.box(3, 3, 9, 7, "#fff", 2)}${P.line(16, 4, 26, "#51494c")}${P.line(16, 9, 20, "#a07c6d", 2)}${P.line(3, 20, 10, "#a07c6d", 2)}${P.line(3, 27, 9, "#51494c", 2)}${P.line(3, 32, 9, "#51494c", 2)}${P.line(20, 24, 34, "#e5e7eb")}${P.line(20, 31, 34, "#e5e7eb")}${P.line(20, 38, 34, "#e5e7eb")}${P.line(20, 45, 26, "#e5e7eb")}</svg>`,
  },
  {
    id: "lin",
    label: "Lin",
    description: "Minimal grège, panneau compétences",
    color: "#c6c7bc",
    preview: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72">${P.box(0, 0, 60, 72, "#fff")}${P.box(0, 0, 15, 72, "#f0f1ec")}${P.dot(7.5, 10, 5, "#a28779")}${P.line(3, 20, 9, "#8a7f73", 2)}${P.line(3, 25, 8, "#4a453f", 2)}${P.box(2, 40, 11, 28, "#c6c7bc", 2)}${P.line(20, 6, 30, "#4a453f")}${P.line(20, 12, 22, "#8a7f73", 2)}${P.line(20, 22, 34, "#e5e7eb")}${P.line(20, 29, 34, "#e5e7eb")}${P.line(20, 36, 34, "#e5e7eb")}${P.line(20, 43, 26, "#e5e7eb")}</svg>`,
  },
  {
    id: "feuillage",
    label: "Feuillage",
    description: "Médaillon photo, sections en bandes",
    color: "#798174",
    preview: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72">${P.box(0, 0, 60, 72, "#fafafa")}${P.box(3, 3, 14, 12, "#c4cfbb", 3)}${P.dot(10, 9, 5, "#ad6757")}${P.line(22, 6, 30, "#3a3a36")}${P.line(22, 11, 22, "#798174", 2)}${P.box(3, 20, 54, 12, "#e1efd9", 3)}${P.line(7, 22, 26, "#798174", 2)}${P.line(7, 27, 46, "#ffffff", 2)}${P.box(3, 36, 54, 12, "#edeeeb", 3)}${P.line(7, 38, 26, "#798174", 2)}${P.line(7, 43, 46, "#ffffff", 2)}${P.box(3, 52, 54, 12, "#e1efd9", 3)}${P.line(7, 54, 26, "#798174", 2)}</svg>`,
  },
  {
    id: "ardoise",
    label: "Ardoise",
    description: "Cartes grises + sidebar marine à droite",
    color: "#274661",
    preview: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72">${P.box(0, 0, 60, 72, "#fafafa")}${P.box(45, 0, 15, 72, "#1b3a55")}${P.dot(52.5, 10, 5, "#fff")}${P.box(3, 6, 38, 14, "#eef0f1", 3)}${P.line(7, 8, 20, "#274661", 2)}${P.box(3, 24, 38, 20, "#eef0f1", 3)}${P.line(7, 26, 20, "#274661", 2)}${P.line(7, 33, 30, "#d5dade", 2)}${P.box(3, 48, 38, 20, "#eef0f1", 3)}${P.line(7, 50, 20, "#274661", 2)}</svg>`,
  },
  {
    id: "obsidienne",
    label: "Obsidienne",
    description: "Noir & or, sidebar bicolore",
    color: "#e8ae04",
    preview: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72">${P.box(0, 0, 60, 72, "#f7f6f5")}${P.box(0, 0, 15, 36, "#1f1c1d")}${P.dot(7.5, 8, 4.5, "#e8ae04")}${P.line(4, 18, 8, "#f3d16b", 2)}${P.box(0, 36, 15, 36, "#e8ae04")}${P.line(4, 42, 8, "#3d3005", 2)}${P.box(15, 0, 45, 12, "#f3d16b")}${P.line(20, 4, 30, "#3d3005")}${P.line(24, 22, 26, "#2c2620")}${P.line(22, 30, 32, "#e5e7eb")}${P.line(22, 37, 32, "#e5e7eb")}${P.line(22, 44, 32, "#e5e7eb")}${P.box(0, 66, 60, 6, "#e8ae04")}</svg>`,
  },
  {
    id: "lagune",
    label: "Lagune",
    description: "En-tête sombre, grosse photo, turquoise",
    color: "#23aab4",
    preview: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72">${P.box(0, 0, 60, 72, "#fafafa")}${P.box(0, 0, 60, 17, "#1f2b37")}${P.box(4, 3, 12, 12, "#b7a9a5", 2)}${P.line(20, 5, 32, "#fff")}${P.line(20, 10, 24, "#79c3cf", 2)}${P.box(0, 17, 60, 4, "#23aab4")}${P.box(0, 21, 16, 47, "#23aab4")}${P.line(4, 28, 9, "#ffffff", 2)}${P.line(4, 36, 8, "#ffffff", 2)}${P.line(22, 28, 30, "#23aab4")}${P.line(22, 35, 30, "#e5e7eb")}${P.line(22, 42, 30, "#e5e7eb")}</svg>`,
  },
  {
    id: "camee",
    label: "Camée",
    description: "Blocs arrondis rose & gris empilés",
    color: "#e2c0bf",
    preview: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72">${P.box(0, 0, 60, 72, "#fafafa")}${P.box(3, 3, 13, 11, "#d6ad9f", 3)}${P.dot(9.5, 8.5, 4.5, "#a56961")}${P.line(21, 5, 32, "#3b2f2e")}${P.line(21, 10, 22, "#a56961", 2)}${P.box(3, 19, 54, 11, "#e2c0bf", 4)}${P.line(7, 21, 24, "#a56961", 2)}${P.line(7, 26, 46, "#ffffff", 2)}${P.box(3, 34, 54, 11, "#eeedee", 4)}${P.line(7, 36, 24, "#a56961", 2)}${P.line(7, 41, 46, "#ffffff", 2)}${P.box(3, 49, 54, 11, "#e2c0bf", 4)}${P.line(7, 51, 24, "#a56961", 2)}</svg>`,
  },
  {
    id: "carmin",
    label: "Carmin",
    description: "Cadre rouge, grosse photo en tête",
    color: "#d42036",
    preview: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72">${P.box(0, 0, 60, 72, "#fafafa")}${P.box(0, 0, 60, 16, "#d42036")}${P.box(3, 3, 12, 11, "#e0a7ae", 2)}${P.line(19, 5, 32, "#fff")}${P.line(19, 10, 26, "#f5c9ce", 2)}${P.box(0, 16, 60, 3, "#ffffff")}${P.line(5, 24, 26, "#d42036")}${P.line(5, 31, 44, "#eee2e4", 2)}${P.line(5, 38, 44, "#eee2e4", 2)}${P.box(47, 40, 13, 28, "#d42036")}${P.line(5, 52, 30, "#d42036")}${P.line(5, 58, 30, "#eee2e4", 2)}${P.box(0, 68, 60, 4, "#d42036")}</svg>`,
  },
  {
    id: "nocturne",
    label: "Nocturne",
    description: "En-tête géant bleu nuit, photo centrale",
    color: "#14254e",
    preview: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72">${P.box(0, 0, 60, 72, "#fafafa")}${P.box(0, 0, 60, 30, "#181424")}${P.dot(30, 10, 6, "#c3b4bf")}${P.line(14, 20, 32, "#ffffff")}${P.line(20, 25, 20, "#6d678e", 2)}${P.box(0, 30, 60, 4, "#6d678e")}${P.line(8, 40, 24, "#23212e")}${P.line(8, 47, 44, "#e5e7eb")}${P.line(8, 54, 44, "#e5e7eb")}${P.line(8, 61, 32, "#e5e7eb")}${P.box(52, 62, 8, 10, "#83728e", 2)}</svg>`,
  },
  {
    id: "lagon",
    label: "Lagon",
    description: "Bandes turquoise haut & bas + timeline",
    color: "#04aea1",
    preview: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72">${P.box(0, 0, 60, 72, "#fafafa")}${P.box(0, 0, 60, 15, "#04aea1")}${P.dot(8, 7.5, 4.5, "#ffffff")}${P.line(16, 4, 30, "#ffffff")}${P.line(16, 9, 24, "#c9f2ee", 2)}${P.box(7, 24, 2, 34, "#9fdeda")}${P.dot(8, 26, 3, "#04aea1")}${P.line(14, 25, 30, "#04aea1")}${P.line(14, 31, 40, "#e5e7eb")}${P.dot(8, 44, 3, "#04aea1")}${P.line(14, 43, 30, "#04aea1")}${P.line(14, 49, 40, "#e5e7eb")}${P.dot(8, 57, 3, "#04aea1")}${P.box(0, 64, 60, 8, "#04aea1")}</svg>`,
  },
  {
    id: "prune",
    label: "Prune",
    description: "Sidebar violette, cartes blanches, pastilles",
    color: "#892587",
    preview: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72">${P.box(0, 0, 60, 72, "#fafafa")}${P.box(0, 0, 16, 72, "#892587")}${P.dot(8, 9, 5, "#ffffff")}${P.box(3, 20, 10, 12, "#ffffff", 2)}${P.line(5, 23, 6, "#892587", 2)}${P.line(5, 27, 6, "#3b2a3b", 2)}${P.box(3, 38, 10, 16, "#ffffff", 2)}${P.line(5, 41, 6, "#892587", 2)}${P.box(21, 4, 34, 7, "#c7a4c6", 3)}${P.line(24, 6, 22, "#3b2a3b", 2)}${P.line(21, 16, 34, "#e5e7eb")}${P.line(21, 23, 34, "#e5e7eb")}${P.box(21, 32, 34, 7, "#c7a4c6", 3)}${P.line(21, 44, 34, "#e5e7eb")}${P.line(21, 51, 34, "#e5e7eb")}</svg>`,
  },
];
