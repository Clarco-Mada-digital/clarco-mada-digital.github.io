/**
 * Génération de CV en PDF (vrai texte vectoriel) à partir des données du
 * portfolio, avec plusieurs templates GRAPHIQUES (photo, bandeau/sidebar
 * coloré, en-têtes de section colorés, mise en page deux colonnes).
 * pdfmake est chargé dynamiquement pour ne pas alourdir le bundle.
 *
 * Le catalogue des templates vit dans `cv-templates.ts` (métadonnées seules)
 * pour que la modale puisse l'afficher sans tirer ce module dans le bundle
 * initial. Ce fichier n'est chargé qu'au moment de générer un PDF.
 */
import { assetUrl } from "../lib/url";
import type { Content } from "../lib/content";
import { CV_TEMPLATES } from "./cv-templates";
export type { CvTemplate } from "./cv-templates";
export { CV_TEMPLATES };

const A4 = { width: 595.28, height: 841.89 };

/** Retire les balises HTML et le markdown léger (gras **…**) — les textes saisis dans l'admin peuvent en contenir. */
function stripHtml(s: string): string {
  return (s || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

export type CvMode = "complet" | "simple";

interface CvData {
  projects: Content["projects"];
  experience: Content["experience"];
  skills: Content["skills"];
  about: string;
}

/** Prépare les données à afficher selon le mode (complet = tout, simple = condensé 1 page). */
function prepareCvData(c: Content, mode: CvMode): CvData {
  const included = c.projects.filter((p) => p.includeInCv !== false);
  const sorted = [...included].sort((a, b) => {
    const featDiff = (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    if (featDiff !== 0) return featDiff;
    return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0);
  });
  const aboutFull = c.about.paragraphs.length
    ? c.about.paragraphs.map(stripHtml).join("  ")
    : stripHtml(c.hero.tagline);
  if (mode === "simple") {
    const aboutSimple = stripHtml(c.about.paragraphs[0] || c.hero.tagline);
    return {
      projects: sorted.slice(0, 2),
      experience: c.experience.slice(0, 1),
      skills: c.skills.slice(0, 2).map((cat) => ({ ...cat, items: cat.items.slice(0, 6) })),
      about: aboutSimple,
    };
  }
  return { projects: sorted, experience: c.experience, skills: c.skills, about: aboutFull };
}

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface ContactItem {
  /** Court repère façon icône (2-4 lettres), affiché dans un badge coloré. */
  abbr: string;
  label: string;
  value: string;
}
function contactItems(c: Content): ContactItem[] {
  const items: ContactItem[] = [];
  if (c.contact.phone) items.push({ abbr: "TÉL", label: "Téléphone", value: c.contact.phone });
  if (c.contact.email) items.push({ abbr: "MAIL", label: "Email", value: c.contact.email });
  if (c.contact.location) items.push({ abbr: "LIEU", label: "Localisation", value: c.contact.location });
  if (c.socials.github) items.push({ abbr: "GH", label: "GitHub", value: c.socials.github.replace(/^https?:\/\//, "") });
  if (c.socials.linkedin) items.push({ abbr: "IN", label: "LinkedIn", value: c.socials.linkedin.replace(/^https?:\/\//, "") });
  return items;
}

/** Badge coloré façon "icône" (abréviation) + valeur — remplace les labels bruts. */
function contactChip(it: ContactItem, chipFill: string, chipText: string, valueColor: string): any {
  return {
    columns: [
      {
        width: 30,
        table: {
          widths: ["*"],
          body: [[{ text: it.abbr, color: chipText, bold: true, fontSize: 6.5, alignment: "center", fillColor: chipFill, margin: [0, 3, 0, 3] }]],
        },
        layout: "noBorders",
      },
      { width: "*", text: it.value, fontSize: 8.5, color: valueColor, margin: [7, 3, 0, 0] },
    ],
    columnGap: 0,
    margin: [0, 4, 0, 0],
  };
}

/** Bloc "Projets" enrichi : nom/année, origine perso/pro (+ entreprise), description, stack. */
function projectBlock(p: Content["projects"][number], accent: string, titleColor: string, descColor: string, mutedColor: string): any {
  const origin =
    p.category === "pro"
      ? { text: `${p.company || "Mission professionnelle"}${p.employment === "freelance" ? " · Freelance" : p.company ? " · Salarié" : ""}`, color: accent, bold: true, fontSize: 8, margin: [0, 1, 0, 2] }
      : { text: "Projet personnel", color: mutedColor, italics: true, fontSize: 8, margin: [0, 1, 0, 2] };
  const stack: any[] = [
    {
      columns: [
        { text: p.name, bold: true, fontSize: 10, color: titleColor, width: "*" },
        { text: p.year, fontSize: 8.5, color: mutedColor, alignment: "right", width: "auto" },
      ],
    },
    origin,
    { text: stripHtml(p.shortDesc), fontSize: 9, color: descColor, lineHeight: 1.22 },
  ];
  if (p.tags?.length) stack.push({ text: p.tags.slice(0, 4).join("  ·  "), fontSize: 7.5, color: mutedColor, margin: [0, 2, 0, 0] });
  return { margin: [0, 0, 0, 8], stack };
}

/** Ligne de contact "inline" (abréviation + valeur) pour les en-têtes de bandeau. */
function contactInline(c: Content, abbrColor: string, valueColor: string): any {
  return {
    text: contactItems(c).flatMap((it, i, arr) => [
      { text: it.abbr + " ", bold: true, fontSize: 7, color: abbrColor },
      { text: it.value + (i < arr.length - 1 ? "     " : ""), fontSize: 8.5, color: valueColor },
    ]),
    alignment: "center",
    lineHeight: 1.6,
  };
}

/* ----------------------- Helpers de mise en page ----------------------- */

/**
 * Boîte à coins arrondis (table 9-grilles : coins transparents, bords remplis).
 * Fonctionne sur fond clair OU sur fond coloré (la couleur de fond traverse les coins).
 */
function roundedBox(content: any[], fill: string, radius = 6): any {
  const corner = () => ({ text: "", fontSize: 1, margin: [0, 0, 0, 0] });
  const edge = () => ({ text: "", fontSize: 1, fillColor: fill, margin: [0, 0, 0, 0] });
  return {
    table: {
      widths: [radius + 3, "*", radius + 3],
      body: [
        [corner(), edge(), corner()],
        [edge(), { stack: content, fillColor: fill }, edge()],
        [corner(), edge(), corner()],
      ],
    },
    layout: "noBorders",
    margin: [0, 0, 0, 0],
  };
}

/** Élément de timeline : petit rond + contenu (reprise du gabarit "sable"). */
function timelineItem(top: any[], body: any[], color: string): any {
  return {
    columns: [
      { width: 12, canvas: [{ type: "ellipse", x: 4, y: 6, r1: 3, r2: 3, lineWidth: 1.2, lineColor: color, color: "#ffffff" }] },
      { width: "*", stack: [...top, ...body] },
    ],
    columnGap: 2,
    margin: [0, 0, 0, 10],
  };
}

/* ====================== TEMPLATE 1 : ÉLÉGANT (sidebar sombre) ====================== */
function elegant(c: Content, photo: CvPhoto, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const SIDE = "#2b2d42";
  const ACCENT = "#0d9488";
  const SW = 205;
  const light = "#cbd2dc";
  const img = photo.circle;

  const sideHeading = (t: string) => ({
    text: t.toUpperCase(),
    color: "#ffffff",
    bold: true,
    fontSize: 9.5,
    characterSpacing: 1,
    margin: [0, 14, 0, 4],
  });
  const sideRule = () => ({
    canvas: [{ type: "line", x1: 0, y1: 0, x2: SW - 40, y2: 0, lineWidth: 1, lineColor: ACCENT }],
    margin: [0, 0, 0, 6],
  });
  const mainHeading = (t: string) => ({
    columns: [
      { width: 4, canvas: [{ type: "rect", x: 0, y: 1, w: 4, h: 12, color: ACCENT }] },
      { text: t.toUpperCase(), bold: true, fontSize: 11, color: "#1f2937", margin: [8, 0, 0, 0], characterSpacing: 0.5 },
    ],
    margin: [0, 16, 0, 8],
  });

  const sidebar: any[] = [];
  if (img) sidebar.push({ image: img, width: 120, alignment: "center", margin: [0, 0, 0, 10] });
  sidebar.push({ text: c.site.name, color: "#ffffff", bold: true, fontSize: 16, alignment: "center" });
  sidebar.push({ text: c.site.role, color: ACCENT, fontSize: 9.5, alignment: "center", margin: [0, 2, 0, 4] });

  sidebar.push(sideHeading("Contact"), sideRule());
  for (const it of contactItems(c)) {
    sidebar.push(contactChip(it, ACCENT, "#ffffff", light));
  }

  sidebar.push(sideHeading("Compétences"), sideRule());
  for (const cat of data.skills) {
    sidebar.push({ text: cat.name, color: "#ffffff", fontSize: 9, bold: true, margin: [0, 5, 0, 1] });
    sidebar.push({ text: cat.items.join(", "), color: light, fontSize: 8.5, lineHeight: 1.2 });
  }

  const main: any[] = [];
  main.push(mainHeading("Profil"));
  main.push({ text: data.about, fontSize: 10, color: "#374151", lineHeight: 1.3 });
  main.push(mainHeading("Expériences"));
  for (const e of data.experience) {
    main.push({
      margin: [0, 0, 0, 9],
      stack: [
        {
          columns: [
            { text: `${e.role}`, bold: true, fontSize: 11, color: "#1f2937", width: "*" },
            { text: e.period, fontSize: 8.5, color: "#9ca3af", alignment: "right", width: "auto" },
          ],
        },
        { text: e.company, color: ACCENT, fontSize: 9.5, bold: true, margin: [0, 1, 0, 2] },
        { text: e.description, fontSize: 9.5, color: "#4b5563", lineHeight: 1.25 },
        { text: e.tech.join(" · "), fontSize: 8, color: "#9ca3af", margin: [0, 2, 0, 0] },
      ],
    });
  }
  main.push(mainHeading("Projets"));
  for (const p of data.projects) {
    main.push(projectBlock(p, ACCENT, "#1f2937", "#4b5563", "#9ca3af"));
  }

  return {
    pageMargins: [0, 22, 0, 26],
    defaultStyle: { font: "Roboto" },
    background: () => ({ canvas: [{ type: "rect", x: 0, y: 0, w: SW, h: A4.height, color: SIDE }] }),
    content: [
      {
        columns: [
          { width: SW, stack: sidebar, margin: [20, 6, 20, 6] },
          { width: "*", stack: main, margin: [22, 8, 28, 6] },
        ],
        columnGap: 0,
      },
    ],
  };
}

/* ====================== TEMPLATE 2 : VIBRANT (bandeau coloré) ====================== */
function vibrant(c: Content, photo: CvPhoto, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const BANNER = "#4f46e5";
  const ACCENT = "#4f46e5";
  const BANNER_H = 215;
  const TOP_MARGIN = 30;
  const img = photo.circle;

  const head: any[] = [];
  if (img) head.push({ image: img, width: 78, alignment: "center", margin: [0, 0, 0, 7] });
  head.push({ text: c.site.name, color: "#ffffff", bold: true, fontSize: 22, alignment: "center", characterSpacing: 1 });
  head.push({ text: c.site.role, color: "#dbeafe", fontSize: 10.5, alignment: "center", margin: [0, 2, 0, 9] });
  head.push(contactInline(c, "#c7d2fe", "#eef2ff"));

  const secHead = (t: string) => ({ text: t.toUpperCase(), bold: true, fontSize: 12, color: ACCENT, margin: [0, 14, 0, 6], characterSpacing: 1 });

  const leftCol: any[] = [];
  leftCol.push(secHead("Profil"));
  leftCol.push({ text: data.about, fontSize: 9.5, color: "#374151", lineHeight: 1.3, alignment: "justify" });
  leftCol.push(secHead("Compétences"));
  for (const cat of data.skills) {
    leftCol.push({ text: cat.name, bold: true, fontSize: 9.5, color: "#1f2937", margin: [0, 5, 0, 1] });
    leftCol.push({ text: cat.items.join(", "), fontSize: 8.5, color: "#6b7280", lineHeight: 1.2 });
  }

  const rightCol: any[] = [];
  rightCol.push(secHead("Expérience"));
  for (const e of data.experience) {
    rightCol.push({
      margin: [0, 0, 0, 8],
      stack: [
        { text: e.period, fontSize: 8, color: "#9ca3af" },
        { text: e.role, bold: true, fontSize: 10.5, color: "#1f2937" },
        { text: e.company, color: ACCENT, fontSize: 9, bold: true, margin: [0, 0, 0, 2] },
        { text: e.description, fontSize: 9, color: "#4b5563", lineHeight: 1.25 },
      ],
    });
  }
  rightCol.push(secHead("Projets"));
  for (const p of data.projects) {
    rightCol.push(projectBlock(p, ACCENT, "#1f2937", "#4b5563", "#9ca3af"));
  }

  return {
    pageMargins: [40, TOP_MARGIN, 40, 36],
    defaultStyle: { font: "Roboto" },
    background: (page: number) =>
      page === 1
        ? { canvas: [{ type: "rect", x: 0, y: 0, w: A4.width, h: BANNER_H, color: BANNER }] }
        : null,
    content: [
      { stack: head, absolutePosition: { x: 40, y: 22 }, width: A4.width - 80 },
      {
        columns: [
          { width: "38%", stack: leftCol },
          { width: "*", stack: rightCol, margin: [16, 0, 0, 0] },
        ],
        margin: [0, BANNER_H - TOP_MARGIN + 14, 0, 0],
      },
    ],
  };
}

/* ====================== TEMPLATE 3 : SOLAIRE (blocs jaunes encadrés) ====================== */
function solaire(c: Content, photo: CvPhoto, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const YELLOW = "#d9a509";
  const DARK = "#27272a";
  const SW = 190;
  const img = photo.circle;

  const framed = (title: string, body: any[]) => ({
    table: {
      widths: ["*"],
      body: [
        [
          {
            stack: [{ text: title.toUpperCase(), bold: true, fontSize: 12, color: DARK, characterSpacing: 1, margin: [0, 0, 0, 6] }, ...body],
            margin: [12, 8, 12, 8],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 1.4,
      vLineWidth: () => 1.4,
      hLineColor: () => YELLOW,
      vLineColor: () => YELLOW,
    },
    margin: [0, 0, 0, 12],
  });

  const sideHeading = (t: string) => ({
    stack: [
      { text: t.toUpperCase(), color: DARK, bold: true, fontSize: 11, characterSpacing: 1 },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 42, y2: 0, lineWidth: 1, lineColor: DARK }], margin: [0, 2, 0, 0] },
    ],
    margin: [0, 14, 0, 7],
  });

  const sidebar: any[] = [];
  if (img) sidebar.push({ image: img, width: 116, alignment: "center", margin: [0, 0, 0, 12] });
  sidebar.push({ text: c.site.name, color: DARK, bold: true, fontSize: 11, alignment: "center" });
  sidebar.push({ text: c.site.role, color: "#513f05", fontSize: 9, alignment: "center", margin: [0, 2, 0, 2] });
  sidebar.push(sideHeading("Contact"));
  for (const it of contactItems(c)) {
    sidebar.push({ text: it.label + " :", fontSize: 8, bold: true, color: "#513f05", margin: [0, 4, 0, 0] });
    sidebar.push({ text: it.value, fontSize: 8.5, color: DARK });
  }
  sidebar.push(sideHeading("Compétences"));
  for (const cat of data.skills) {
    sidebar.push({ text: cat.name, color: DARK, fontSize: 9, bold: true, margin: [0, 4, 0, 1] });
    sidebar.push({ text: cat.items.join(", "), color: "#43380a", fontSize: 8.5, lineHeight: 1.25 });
  }

  const expBody: any[] = [];
  for (const e of data.experience) {
    expBody.push({
      margin: [0, 0, 0, 8],
      stack: [
        {
          columns: [
            { text: e.role, bold: true, fontSize: 10, color: DARK, width: "*" },
            { text: e.period, fontSize: 8.5, color: "#9ca3af", alignment: "right", width: "auto" },
          ],
        },
        { text: e.company, color: YELLOW, fontSize: 9.5, bold: true, margin: [0, 1, 0, 2] },
        { text: e.description, fontSize: 9, color: "#4b5563", lineHeight: 1.26 },
      ],
    });
  }
  const projBody: any[] = data.projects.map((p) => projectBlock(p, YELLOW, DARK, "#4b5563", "#9ca3af"));

  const main: any[] = [];
  main.push({
    table: { widths: ["*"], body: [[{ text: c.site.name.toUpperCase(), color: "#ffffff", bold: true, fontSize: 19, alignment: "center", fillColor: YELLOW, margin: [10, 12, 10, 12], characterSpacing: 1.5 }]] },
    layout: "noBorders",
    margin: [0, 0, 0, 16],
  });
  main.push(framed("Profil", [{ text: data.about, fontSize: 9.5, color: "#3f3f46", lineHeight: 1.3, alignment: "justify" }]));
  main.push(framed("Expérience", expBody));
  main.push(framed("Projets", projBody));

  return {
    pageMargins: [0, 24, 0, 26],
    defaultStyle: { font: "Roboto" },
    background: () => ({ canvas: [{ type: "rect", x: 0, y: 0, w: SW, h: A4.height, color: "#f59e0b" }] }),
    content: [
      {
        columns: [
          { width: SW, stack: sidebar, margin: [20, 6, 20, 6] },
          { width: "*", stack: main, margin: [24, 8, 30, 6] },
        ],
        columnGap: 0,
      },
    ],
  };
}

/* ====================== TEMPLATE 4 : COTON (bandeau sable + sidebar crème) ====================== */
function coton(c: Content, photo: CvPhoto, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const BAND = "#d9b5a3";
  const SIDE = "#f3dfd3";
  const DARK = "#51494c";
  const ACCENT = "#a07c6d";
  const SW = 150;
  const BAND_H = 104;
  const img = photo.rounded;

  const header: any[] = [];
  if (img) header.push({ image: img, width: 74, margin: [0, 0, 14, 0] });
  header.push({
    stack: [
      { text: c.site.name, bold: true, fontSize: 19, color: "#3a2f2c" },
      { text: c.site.role, fontSize: 10.5, color: "#6b5a52", margin: [0, 3, 0, 4] },
      { text: contactItems(c).map((it) => it.value).join("  ·  "), fontSize: 8, color: "#7d6b63", lineHeight: 1.4 },
    ],
  });

  const sideHeading = (t: string) => ({ text: t.toUpperCase(), bold: true, fontSize: 8.5, color: ACCENT, characterSpacing: 1.5, margin: [0, 12, 0, 4] });

  const sidebar: any[] = [];
  sidebar.push(sideHeading("Contact"));
  for (const it of contactItems(c)) {
    sidebar.push({ text: it.label.toUpperCase(), fontSize: 6.5, bold: true, color: "#9b877d", characterSpacing: 1, margin: [0, 4, 0, 0] });
    sidebar.push({ text: it.value, fontSize: 8, color: DARK });
  }
  sidebar.push(sideHeading("Compétences"));
  for (const cat of data.skills) {
    sidebar.push({ text: cat.name, bold: true, fontSize: 8.5, color: DARK, margin: [0, 5, 0, 1] });
    sidebar.push({ text: cat.items.join(", "), fontSize: 7.5, color: "#6e615b", lineHeight: 1.25 });
  }

  const mainHeading = (t: string) => ({
    stack: [
      { text: t.toUpperCase(), bold: true, fontSize: 11, color: DARK, characterSpacing: 1.2 },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 1.2, lineColor: ACCENT }], margin: [0, 3, 0, 0] },
    ],
    margin: [0, 14, 0, 7],
  });

  const main: any[] = [];
  main.push(mainHeading("Profil"));
  main.push({ text: data.about, fontSize: 9.5, color: "#4a403b", lineHeight: 1.3, alignment: "justify" });
  main.push(mainHeading("Expériences"));
  for (const e of data.experience) {
    main.push({
      margin: [0, 0, 0, 9],
      stack: [
        {
          columns: [
            { text: e.role, bold: true, fontSize: 10.5, color: DARK, width: "*" },
            { text: e.period, fontSize: 8.5, color: "#9a8a81", alignment: "right", width: "auto" },
          ],
        },
        { text: e.company, color: ACCENT, fontSize: 9.5, bold: true, margin: [0, 1, 0, 2] },
        { text: e.description, fontSize: 9, color: "#574c46", lineHeight: 1.25 },
      ],
    });
  }
  main.push(mainHeading("Projets"));
  for (const p of data.projects) {
    main.push(projectBlock(p, ACCENT, DARK, "#574c46", "#9a8a81"));
  }

  return {
    pageMargins: [0, 14, 0, 26],
    defaultStyle: { font: "Roboto" },
    background: (page: number) => {
      const canvas: any[] = [];
      if (page === 1) canvas.push({ type: "rect", x: 0, y: 0, w: A4.width, h: BAND_H, color: BAND });
      // En page 2+, le contenu de la colonne reprend en haut de page : la sidebar
      // doit être peinte depuis y=0 (la marge qui la poussait sous le bandeau ne
      // se réapplique pas sur les pages suivantes).
      const top = page === 1 ? BAND_H : 0;
      canvas.push({ type: "rect", x: 0, y: top, w: SW, h: A4.height - top, color: SIDE });
      return { canvas };
    },
    content: [
      { columns: header, columnGap: 8, absolutePosition: { x: 26, y: 18 }, width: A4.width - 52 },
      {
        columns: [
          { width: SW, stack: sidebar, margin: [18, BAND_H + 6, 16, 6] },
          { width: "*", stack: main, margin: [20, BAND_H + 12, 26, 6] },
        ],
        columnGap: 0,
      },
    ],
  };
}

/* ====================== TEMPLATE 5 : LIN (minimal grège + panneau) ====================== */
function lin(c: Content, photo: CvPhoto, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const SIDE = "#f0f1ec";
  const PANEL = "#c6c7bc";
  const DARK = "#4a453f";
  const ACCENT = "#8a7f73";
  const SW = 150;
  const img = photo.rounded;

  const heading = (t: string) => ({ text: t.toUpperCase(), bold: true, fontSize: 11.5, color: DARK, characterSpacing: 2, margin: [0, 14, 0, 6] });

  const sidebar: any[] = [];
  if (img) sidebar.push({ image: img, width: 96, alignment: "center", margin: [0, 6, 0, 12] });
  sidebar.push({ text: "CONTACT", bold: true, fontSize: 8, color: ACCENT, characterSpacing: 1.5, margin: [0, 2, 0, 4] });
  for (const it of contactItems(c)) {
    sidebar.push({ text: it.label.toUpperCase(), fontSize: 6.5, color: "#9b938a", characterSpacing: 1, margin: [0, 5, 0, 0] });
    sidebar.push({ text: it.value, fontSize: 8.5, color: DARK });
  }
  // Grand panneau gris : compétences (signature du modèle)
  const skillsStack: any[] = [
    { text: "COMPÉTENCES", bold: true, fontSize: 9, color: DARK, characterSpacing: 1.5, margin: [0, 0, 0, 5] },
  ];
  for (const cat of data.skills) {
    skillsStack.push({ text: cat.name, bold: true, fontSize: 8.5, color: DARK, margin: [0, 5, 0, 1] });
    skillsStack.push({ text: cat.items.join(", "), fontSize: 8, color: "#5a554e", lineHeight: 1.25 });
  }
  sidebar.push({
    table: { widths: ["*"], body: [[{ stack: skillsStack, fillColor: PANEL, margin: [10, 8, 10, 8] }]] },
    layout: "noBorders",
    margin: [0, 14, 0, 0],
  });

  const main: any[] = [];
  main.push({ text: c.site.name.toUpperCase(), bold: true, fontSize: 21, color: DARK, characterSpacing: 2 });
  main.push({ text: c.site.role, fontSize: 10.5, color: ACCENT, characterSpacing: 1.5, margin: [0, 3, 0, 0] });
  main.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 260, y2: 0, lineWidth: 1, lineColor: "#b9b2a8" }], margin: [0, 8, 0, 4] });
  main.push(heading("À propos"));
  main.push({ text: data.about, fontSize: 9.5, color: "#55504a", lineHeight: 1.3, alignment: "justify" });
  main.push(heading("Expériences"));
  for (const e of data.experience) {
    main.push(
      timelineItem(
        [
          { text: e.period, fontSize: 8.5, color: "#9b938a" },
          { text: e.role, bold: true, fontSize: 10.5, color: DARK },
          { text: e.company, fontSize: 9, color: ACCENT, bold: true, margin: [0, 0, 0, 2] },
        ],
        [{ text: e.description, fontSize: 9, color: "#55504a", lineHeight: 1.3 }],
        DARK
      )
    );
  }
  main.push(heading("Projets"));
  for (const p of data.projects) {
    main.push(projectBlock(p, ACCENT, DARK, "#55504a", "#9b938a"));
  }

  return {
    pageMargins: [0, 24, 0, 26],
    defaultStyle: { font: "Roboto" },
    background: () => ({ canvas: [{ type: "rect", x: 0, y: 0, w: SW, h: A4.height, color: SIDE }] }),
    content: [
      {
        columns: [
          { width: SW, stack: sidebar, margin: [18, 6, 16, 6] },
          { width: "*", stack: main, margin: [24, 10, 28, 6] },
        ],
        columnGap: 0,
      },
    ],
  };
}

/* ====================== TEMPLATE 6 : FEUILLAGE (médaillon + bandes vertes) ====================== */
function feuillage(c: Content, photo: CvPhoto, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const GREEN = "#798174";
  const ACCENT = "#ad6757";
  const DARK = "#3a3a36";
  const img = photo.rounded;

  const header: any[] = [];
  if (img) header.push({ image: img, width: 76 });
  header.push({
    stack: [
      { text: c.site.name, bold: true, fontSize: 18, color: DARK },
      { text: c.site.role, fontSize: 10.5, color: "#6d7163", margin: [0, 3, 0, 0] },
    ],
    margin: [14, 0, 0, 0],
  });

  const band = (title: string, body: any[], fill: string) =>
    roundedBox(
      [
        { text: title.toUpperCase(), bold: true, fontSize: 10.5, color: GREEN, characterSpacing: 1.5, margin: [12, 8, 12, 3] },
        ...body,
      ],
      fill,
      7
    );

  const expBody = data.experience.map((e) => ({
    margin: [12, 0, 12, 7],
    stack: [
      {
        columns: [
          { text: e.role, bold: true, fontSize: 10, color: DARK, width: "*" },
          { text: e.period, fontSize: 8, color: "#8a8f83", alignment: "right", width: "auto" },
        ],
      },
      { text: e.company, color: ACCENT, fontSize: 9, bold: true, margin: [0, 0, 0, 1] },
      { text: e.description, fontSize: 8.5, color: "#55584f", lineHeight: 1.25 },
    ],
  }));
  const projBody = data.projects.map((p) => projectBlock(p, ACCENT, DARK, "#55584f", "#8a8f83"));

  const skillBody = data.skills.flatMap((cat) => [
    { text: cat.name, bold: true, fontSize: 9, color: DARK, margin: [12, 4, 12, 1] },
    { text: cat.items.join(", "), fontSize: 8.5, color: "#55584f", lineHeight: 1.25, margin: [12, 0, 12, 2] },
  ]);

  return {
    pageMargins: [40, 34, 40, 34],
    defaultStyle: { font: "Roboto" },
    content: [
      { columns: header, columnGap: 6, margin: [0, 0, 0, 4] },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: A4.width - 80, y2: 0, lineWidth: 1, lineColor: "#c9cdc2" }], margin: [0, 6, 0, 16] },
      band("Profil", [{ text: data.about, fontSize: 9, color: "#4e5149", lineHeight: 1.3, alignment: "justify", margin: [12, 0, 12, 8] }], "#e1efd9"),
      band("Compétences", skillBody, "#edeeeb"),
      band("Expérience", expBody, "#e1efd9"),
      band("Projets", projBody, "#edeeeb"),
    ],
  };
}

/* ====================== TEMPLATE 7 : ARDOISE (cartes grises + sidebar marine) ====================== */
function ardoise(c: Content, photo: CvPhoto, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const NAVY = "#274661";
  const NAVY_D = "#1b3a55";
  const CARD = "#eef0f1";
  const DARK = "#22303c";
  const SW = 142;
  const img = photo.circle;

  const card = (title: string, body: any[]) =>
    roundedBox(
      [{ text: title.toUpperCase(), bold: true, fontSize: 10.5, color: NAVY, characterSpacing: 1.2, margin: [12, 8, 12, 4] }, ...body],
      CARD,
      7
    );

  const expBody = data.experience.map((e) => ({
    margin: [12, 0, 12, 8],
    stack: [
      {
        columns: [
          { text: e.role, bold: true, fontSize: 10, color: DARK, width: "*" },
          { text: e.period, fontSize: 8, color: "#93a0aa", alignment: "right", width: "auto" },
        ],
      },
      { text: e.company, color: NAVY, fontSize: 9, bold: true, margin: [0, 0, 0, 1] },
      { text: e.description, fontSize: 8.5, color: "#4d5b66", lineHeight: 1.25 },
    ],
  }));
  const projBody = data.projects.map((p) => projectBlock(p, NAVY, DARK, "#4d5b66", "#93a0aa"));

  const main: any[] = [];
  main.push({ text: c.site.name, bold: true, fontSize: 20, color: DARK });
  main.push({ text: c.site.role, fontSize: 10.5, color: NAVY, margin: [0, 2, 0, 4] });
  main.push({ text: contactItems(c).map((it) => it.value).join("   ·   "), fontSize: 8, color: "#7c8a94", lineHeight: 1.4 });
  main.push({ margin: [0, 10, 0, 10], stack: [card("Profil", [{ text: data.about, fontSize: 9, color: "#44525c", lineHeight: 1.3, alignment: "justify", margin: [12, 0, 12, 8] }])] });
  main.push({ margin: [0, 0, 0, 10], stack: [card("Expériences", expBody)] });
  main.push({ margin: [0, 0, 0, 10], stack: [card("Projets", projBody)] });

  const sideHeading = (t: string) => ({
    stack: [
      { text: t.toUpperCase(), color: "#ffffff", bold: true, fontSize: 9.5, characterSpacing: 1.5 },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: SW - 40, y2: 0, lineWidth: 1, lineColor: "#8fa8c7" }], margin: [0, 3, 0, 0] },
    ],
    margin: [0, 16, 0, 7],
  });

  const sidebar: any[] = [];
  if (img) sidebar.push({ image: img, width: 88, alignment: "center", margin: [0, 10, 0, 14] });
  sidebar.push(sideHeading("Contact"));
  for (const it of contactItems(c)) {
    sidebar.push({ text: it.label.toUpperCase(), fontSize: 6.5, color: "#a9bccb", characterSpacing: 1, margin: [0, 5, 0, 0] });
    sidebar.push({ text: it.value, fontSize: 8.5, color: "#ffffff" });
  }
  sidebar.push(sideHeading("Compétences"));
  for (const cat of data.skills) {
    sidebar.push({ text: cat.name, color: "#ffffff", fontSize: 8.5, bold: true, margin: [0, 5, 0, 1] });
    sidebar.push({ text: cat.items.join(", "), color: "#c3d2dc", fontSize: 8, lineHeight: 1.25 });
  }

  return {
    pageMargins: [0, 24, 0, 26],
    defaultStyle: { font: "Roboto" },
    background: () => ({ canvas: [{ type: "rect", x: A4.width - SW, y: 0, w: SW, h: A4.height, color: NAVY_D }] }),
    content: [
      {
        columns: [
          { width: "*", stack: main, margin: [34, 8, 24, 6] },
          { width: SW, stack: sidebar, margin: [18, 6, 18, 6] },
        ],
        columnGap: 0,
      },
    ],
  };
}

/* ====================== TEMPLATE 8 : OBSIDIENNE (noir & or, sidebar bicolore) ====================== */
function obsidienne(c: Content, photo: CvPhoto, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const BLACK = "#1f1c1d";
  const GOLD = "#e8ae04";
  const GOLD_L = "#f3d16b";
  const DARK = "#2c2620";
  const SW = 150;
  const HEAD_H = 86;
  const img = photo.circle;

  const darkStack: any[] = [];
  if (img) darkStack.push({ image: img, width: 76, alignment: "center", margin: [0, 10, 0, 8] });
  darkStack.push({ text: c.site.name, color: "#ffffff", bold: true, fontSize: 13, alignment: "center" });
  darkStack.push({ text: c.site.role, color: "#c9a24b", fontSize: 8.5, alignment: "center", margin: [0, 2, 0, 6] });
  darkStack.push({ text: "CONTACT", bold: true, fontSize: 8, color: GOLD, characterSpacing: 1.5, alignment: "center", margin: [0, 4, 0, 3] });
  for (const it of contactItems(c)) {
    darkStack.push({ text: it.abbr, fontSize: 6.5, bold: true, color: GOLD, alignment: "center", margin: [0, 3, 0, 0] });
    darkStack.push({ text: it.value, fontSize: 8, color: "#e8e2d8", alignment: "center", lineHeight: 1.2 });
  }

  const goldStack: any[] = [{ text: "COMPÉTENCES", bold: true, fontSize: 8, color: "#3d3005", characterSpacing: 1.5, alignment: "center", margin: [0, 0, 0, 5] }];
  for (const cat of data.skills) {
    goldStack.push({ text: cat.name, bold: true, fontSize: 8.5, color: "#3d3005", alignment: "center", margin: [0, 5, 0, 1] });
    goldStack.push({ text: cat.items.join(", "), fontSize: 7.5, color: "#5c4a12", alignment: "center", lineHeight: 1.2 });
  }

  const sidebar: any[] = [
    { table: { widths: ["*"], body: [[{ stack: darkStack, fillColor: BLACK, margin: [10, 4, 10, 10] }]] }, layout: "noBorders" },
    { table: { widths: ["*"], body: [[{ stack: goldStack, fillColor: GOLD, margin: [10, 8, 10, 12] }]] }, layout: "noBorders" },
  ];

  const mainHeading = (t: string) => ({
    stack: [
      { text: t.toUpperCase(), bold: true, fontSize: 11.5, color: DARK, characterSpacing: 1.5 },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 90, y2: 0, lineWidth: 1.4, lineColor: GOLD }], margin: [0, 3, 0, 0] },
    ],
    margin: [0, 14, 0, 7],
  });

  const main: any[] = [];
  main.push(mainHeading("Profil"));
  main.push({ text: data.about, fontSize: 9.5, color: "#4b4439", lineHeight: 1.3, alignment: "justify" });
  main.push(mainHeading("Expériences"));
  for (const e of data.experience) {
    main.push({
      margin: [0, 0, 0, 9],
      stack: [
        {
          columns: [
            { text: e.role, bold: true, fontSize: 10.5, color: DARK, width: "*" },
            { text: e.period, fontSize: 8.5, color: "#a89b83", alignment: "right", width: "auto" },
          ],
        },
        { text: e.company, color: "#a37c0a", fontSize: 9.5, bold: true, margin: [0, 1, 0, 2] },
        { text: e.description, fontSize: 9, color: "#554c3e", lineHeight: 1.25 },
      ],
    });
  }
  main.push(mainHeading("Projets"));
  for (const p of data.projects) {
    main.push(projectBlock(p, "#a37c0a", DARK, "#554c3e", "#a89b83"));
  }

  const head: any[] = [
    { text: c.site.name.toUpperCase(), bold: true, fontSize: 19, color: "#3d3005", characterSpacing: 1.5 },
    { text: c.site.role, fontSize: 10, color: "#5c4a12", margin: [0, 2, 0, 0] },
  ];

  return {
    pageMargins: [0, 24, 0, 40],
    defaultStyle: { font: "Roboto" },
    background: (page: number) => {
      const canvas: any[] = [];
      // Or derrière toute la sidebar : la table sombre (photo/contact) la recouvre,
      // la section or (compétences) se prolonge donc jusqu'en bas de page.
      canvas.push({ type: "rect", x: 0, y: 0, w: SW, h: A4.height, color: GOLD });
      if (page === 1) canvas.push({ type: "rect", x: SW, y: 0, w: A4.width - SW, h: HEAD_H, color: GOLD_L });
      canvas.push({ type: "rect", x: 0, y: A4.height - 20, w: A4.width, h: 20, color: GOLD });
      return { canvas };
    },
    content: [
      { stack: head, absolutePosition: { x: SW + 26, y: 18 }, width: A4.width - SW - 52 },
      {
        columns: [
          { width: SW, stack: sidebar, margin: [18, 8, 18, 6] },
          { width: "*", stack: main, margin: [22, HEAD_H + 18, 30, 6] },
        ],
        columnGap: 0,
      },
    ],
  };
}

/* ====================== TEMPLATE 9 : LAGUNE (en-tête sombre, grosse photo, turquoise) ====================== */
function lagune(c: Content, photo: CvPhoto, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const NAVY = "#1f2b37";
  const TEAL = "#23aab4";
  const TEAL_L = "#3cbbc4";
  const HEAD_H = 128;
  const SW = 165;
  const img = photo.rounded;

  const head: any[] = [];
  if (img) head.push({ image: img, width: 92 });
  head.push({
    stack: [
      { text: c.site.name, bold: true, fontSize: 22, color: "#ffffff" },
      { text: c.site.role, fontSize: 11, color: "#79c3cf", margin: [0, 3, 0, 4] },
      { text: contactItems(c).map((it) => it.value).join("   ·   "), fontSize: 8.5, color: "#afb9b9", lineHeight: 1.4 },
    ],
    margin: [16, 0, 0, 0],
  });

  const sideHeading = (t: string) => ({
    stack: [
      { text: t.toUpperCase(), color: "#ffffff", bold: true, fontSize: 10, characterSpacing: 1.5 },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: SW - 40, y2: 0, lineWidth: 1, lineColor: "#8fd7dd" }], margin: [0, 3, 0, 0] },
    ],
    margin: [0, 14, 0, 7],
  });

  const sidebar: any[] = [];
  sidebar.push(sideHeading("Contact"));
  for (const it of contactItems(c)) {
    sidebar.push(contactChip(it, TEAL_L, "#0d2428", "#d7ecee"));
  }
  sidebar.push(sideHeading("Compétences"));
  for (const cat of data.skills) {
    sidebar.push({ text: cat.name, color: "#ffffff", fontSize: 9, bold: true, margin: [0, 5, 0, 1] });
    sidebar.push({ text: cat.items.join(", "), color: "#b9d9dc", fontSize: 8.5, lineHeight: 1.25 });
  }

  const mainHeading = (t: string) => ({
    stack: [
      { text: t.toUpperCase(), bold: true, fontSize: 12, color: TEAL, characterSpacing: 1 },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: A4.width - SW - 70, y2: 0, lineWidth: 0.8, lineColor: "#d1d5db" }], margin: [0, 3, 0, 0] },
    ],
    margin: [0, 16, 0, 8],
  });

  const main: any[] = [];
  main.push(mainHeading("Profil"));
  main.push({ text: data.about, fontSize: 9.5, color: "#3a4651", lineHeight: 1.3 });
  main.push(mainHeading("Expériences"));
  for (const e of data.experience) {
    main.push({
      margin: [0, 0, 0, 9],
      stack: [
        {
          columns: [
            { text: e.role, bold: true, fontSize: 10.5, color: "#1a2731", width: "*" },
            { text: e.period, fontSize: 8.5, color: "#8fa1ac", alignment: "right", width: "auto" },
          ],
        },
        { text: e.company, color: TEAL, fontSize: 9.5, bold: true, margin: [0, 1, 0, 2] },
        { text: e.description, fontSize: 9, color: "#46525c", lineHeight: 1.28 },
      ],
    });
  }
  main.push(mainHeading("Projets"));
  for (const p of data.projects) {
    main.push(projectBlock(p, TEAL, "#1a2731", "#46525c", "#8fa1ac"));
  }

  return {
    pageMargins: [0, 20, 0, 26],
    defaultStyle: { font: "Roboto" },
    background: (page: number) => {
      const canvas: any[] = [];
      if (page === 1) {
        canvas.push({ type: "rect", x: 0, y: 0, w: A4.width, h: HEAD_H, color: NAVY });
        canvas.push({ type: "rect", x: 0, y: HEAD_H, w: A4.width, h: 14, color: TEAL });
      }
      // En page 2+, la sidebar reprend en haut de page (la marge initiale ne se
      // réapplique pas sur les pages suivantes).
      const top = page === 1 ? HEAD_H + 14 : 0;
      canvas.push({ type: "rect", x: 0, y: top, w: SW, h: A4.height - top, color: TEAL });
      return { canvas };
    },
    content: [
      { columns: head, columnGap: 6, absolutePosition: { x: 30, y: 16 }, width: A4.width - 60 },
      {
        columns: [
          { width: SW, stack: sidebar, margin: [20, HEAD_H + 26, 20, 6] },
          { width: "*", stack: main, margin: [22, HEAD_H + 24, 28, 6] },
        ],
        columnGap: 0,
      },
    ],
  };
}

/* ====================== TEMPLATE 10 : CAMÉE (blocs arrondis rose & gris) ====================== */
function camee(c: Content, photo: CvPhoto, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const BLUSH = "#e2c0bf";
  const GREY = "#eeedee";
  const DARK = "#3b2f2e";
  const ACCENT = "#a56961";
  const img = photo.rounded;

  const header: any[] = [];
  if (img) header.push({ image: img, width: 76 });
  header.push({
    stack: [
      { text: c.site.name, bold: true, fontSize: 19, color: DARK },
      { text: c.site.role, fontSize: 10.5, color: ACCENT, margin: [0, 3, 0, 0] },
      { text: contactItems(c).map((it) => it.value).join("   ·   "), fontSize: 8, color: "#9b8b88", margin: [0, 4, 0, 0], lineHeight: 1.4 },
    ],
    margin: [14, 0, 0, 0],
  });

  const box = (title: string, body: any[], fill: string) =>
    roundedBox(
      [{ text: title.toUpperCase(), bold: true, fontSize: 10.5, color: ACCENT, characterSpacing: 1.5, margin: [14, 9, 14, 3] }, ...body],
      fill,
      9
    );

  const expBody = data.experience.map((e) => ({
    margin: [14, 0, 14, 8],
    stack: [
      {
        columns: [
          { text: e.role, bold: true, fontSize: 10, color: DARK, width: "*" },
          { text: e.period, fontSize: 8, color: "#a89a96", alignment: "right", width: "auto" },
        ],
      },
      { text: e.company, color: ACCENT, fontSize: 9, bold: true, margin: [0, 0, 0, 1] },
      { text: e.description, fontSize: 8.5, color: "#5d5250", lineHeight: 1.25 },
    ],
  }));
  const projBody = data.projects.map((p) => projectBlock(p, ACCENT, DARK, "#5d5250", "#a89a96"));
  const skillBody = data.skills.flatMap((cat) => [
    { text: cat.name, bold: true, fontSize: 9, color: DARK, margin: [14, 4, 14, 1] },
    { text: cat.items.join(", "), fontSize: 8.5, color: "#5d5250", lineHeight: 1.25, margin: [14, 0, 14, 2] },
  ]);

  return {
    pageMargins: [46, 34, 46, 34],
    defaultStyle: { font: "Roboto" },
    content: [
      { columns: header, columnGap: 6, margin: [0, 0, 0, 4] },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: A4.width - 92, y2: 0, lineWidth: 1, lineColor: "#e3d3d1" }], margin: [0, 6, 0, 18] },
      box("Profil", [{ text: data.about, fontSize: 9, color: "#5d5250", lineHeight: 1.3, alignment: "justify", margin: [14, 0, 14, 10] }], BLUSH),
      { margin: [0, 12, 0, 0], stack: [box("Compétences", skillBody, GREY)] },
      { margin: [0, 12, 0, 0], stack: [box("Expériences", expBody, BLUSH)] },
      { margin: [0, 12, 0, 0], stack: [box("Projets", projBody, GREY)] },
    ],
  };
}

/* ====================== TEMPLATE 11 : CARMIN (cadre rouge) ====================== */
function carmin(c: Content, photo: CvPhoto, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const RED = "#d42036";
  const RED_L = "#f2d8dc";
  const DARK = "#363441";
  const HEAD_H = 132;
  const STRIP = 16;
  const FOOT = 22;
  const img = photo.rounded;

  const head: any[] = [];
  if (img) head.push({ image: img, width: 96 });
  head.push({
    stack: [
      { text: c.site.name, bold: true, fontSize: 22, color: "#ffffff" },
      { text: c.site.role, fontSize: 11, color: "#f5c9ce", margin: [0, 3, 0, 4] },
      { text: contactItems(c).map((it) => it.value).join("   ·   "), fontSize: 8.5, color: "#f5e0e3", lineHeight: 1.4 },
    ],
    margin: [16, 0, 0, 0],
  });

  const mainHeading = (t: string) => ({
    stack: [
      { text: t.toUpperCase(), bold: true, fontSize: 11.5, color: RED, characterSpacing: 1.2 },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: A4.width - 96, y2: 0, lineWidth: 1, lineColor: "#e8aeb5" }], margin: [0, 3, 0, 0] },
    ],
    margin: [0, 14, 0, 7],
  });

  const main: any[] = [];
  main.push(mainHeading("Profil"));
  main.push({ text: data.about, fontSize: 9.5, color: "#47434e", lineHeight: 1.3, alignment: "justify" });
  main.push(mainHeading("Expériences"));
  for (const e of data.experience) {
    main.push({
      margin: [0, 0, 0, 9],
      stack: [
        {
          columns: [
            { text: e.role, bold: true, fontSize: 10.5, color: DARK, width: "*" },
            { text: e.period, fontSize: 8.5, color: "#9d97a2", alignment: "right", width: "auto" },
          ],
        },
        { text: e.company, color: RED, fontSize: 9.5, bold: true, margin: [0, 1, 0, 2] },
        { text: e.description, fontSize: 9, color: "#57525d", lineHeight: 1.25 },
      ],
    });
  }
  // Compétences dans une pastille rosée, avant les projets
  const skillPill = roundedBox(
    [
      { text: "COMPÉTENCES", bold: true, fontSize: 10.5, color: RED, characterSpacing: 1.2, margin: [12, 8, 12, 4] },
      ...data.skills.flatMap((cat) => [
        { text: cat.name, bold: true, fontSize: 9, color: DARK, margin: [12, 3, 12, 1] },
        { text: cat.items.join(", "), fontSize: 8.5, color: "#57525d", lineHeight: 1.25, margin: [12, 0, 12, 2] },
      ]),
    ],
    RED_L,
    8
  );
  main.push({ margin: [0, 6, 0, 0], stack: [skillPill] });
  main.push(mainHeading("Projets"));
  for (const p of data.projects) {
    main.push(projectBlock(p, RED, DARK, "#57525d", "#9d97a2"));
  }

  return {
    pageMargins: [30, 26, STRIP + 16, FOOT + 18],
    defaultStyle: { font: "Roboto" },
    background: (page: number) => {
      const canvas: any[] = [];
      if (page === 1) canvas.push({ type: "rect", x: 0, y: 0, w: A4.width, h: HEAD_H, color: RED });
      canvas.push({ type: "rect", x: A4.width - STRIP, y: 0, w: STRIP, h: A4.height, color: RED });
      canvas.push({ type: "rect", x: 0, y: A4.height - FOOT, w: A4.width, h: FOOT, color: RED });
      return { canvas };
    },
    content: [
      { columns: head, columnGap: 6, absolutePosition: { x: 30, y: 18 }, width: A4.width - STRIP - 60 },
      { columns: [{ width: "*", stack: main, margin: [0, HEAD_H + 16, 0, 6] }], columnGap: 0 },
    ],
  };
}

/* ====================== TEMPLATE 12 : NOCTURNE (en-tête géant bleu nuit) ====================== */
function nocturne(c: Content, photo: CvPhoto, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const NIGHT = "#181424";
  const PURPLE = "#6d678e";
  const DARK = "#23212e";
  // En mode "simple" (1 page promise), l'en-tête géant est réduit pour laisser
  // la place au contenu condensé.
  const simple = mode === "simple";
  const HEAD_H = simple ? 170 : 300;
  const img = photo.circle;

  const head: any[] = [];
  if (img) head.push({ image: img, width: simple ? 74 : 96, alignment: "center", margin: [0, 0, 0, simple ? 6 : 10] });
  head.push({ text: c.site.name, color: "#ffffff", bold: true, fontSize: simple ? 20 : 26, alignment: "center", characterSpacing: 2 });
  head.push({ text: c.site.role, color: "#a49fc0", fontSize: simple ? 10 : 12, alignment: "center", margin: [0, simple ? 2 : 4, 0, simple ? 6 : 10], characterSpacing: 1.5 });
  head.push(contactInline(c, "#83728e", "#d8d3e6"));

  const secHead = (t: string) => ({ text: t.toUpperCase(), bold: true, fontSize: 12, color: PURPLE, margin: [0, 14, 0, 6], characterSpacing: 1.5 });

  const main: any[] = [];
  main.push(secHead("Profil"));
  main.push({ text: data.about, fontSize: 9.5, color: "#3d3947", lineHeight: 1.35, alignment: "justify" });
  main.push(secHead("Compétences"));
  for (const cat of data.skills) {
    main.push({ text: cat.name, bold: true, fontSize: 9.5, color: DARK, margin: [0, 5, 0, 1] });
    main.push({ text: cat.items.join(", "), fontSize: 8.5, color: "#6b6676", lineHeight: 1.25 });
  }
  main.push(secHead("Expérience"));
  for (const e of data.experience) {
    // En mode simple, la description la plus longue est tronquée pour tenir
    // sur 1 page malgré l'en-tête géant.
    const desc =
      simple && e.description.length > 200
        ? e.description.slice(0, 200).replace(/\s+\S*$/, "") + "…"
        : e.description;
    main.push(
      timelineItem(
        [
          { text: e.period, fontSize: 8, color: "#a5a0b2" },
          { text: e.role, bold: true, fontSize: 10.5, color: DARK },
          { text: e.company, fontSize: 9, color: PURPLE, bold: true, margin: [0, 0, 0, 2] },
        ],
        [{ text: desc, fontSize: 9, color: "#4a4554", lineHeight: 1.28 }],
        PURPLE
      )
    );
  }
  main.push(secHead("Projets"));
  for (const p of data.projects) {
    main.push(projectBlock(p, PURPLE, DARK, "#4a4554", "#a5a0b2"));
  }

  return {
    pageMargins: [48, 26, 48, 34],
    defaultStyle: { font: "Roboto" },
    background: (page: number) =>
      page === 1
        ? {
            canvas: [
              { type: "rect", x: 0, y: 0, w: A4.width, h: HEAD_H, color: NIGHT },
              { type: "rect", x: 0, y: HEAD_H, w: A4.width, h: 10, color: PURPLE },
            ],
          }
        : null,
    content: [
      { stack: head, absolutePosition: { x: 48, y: 30 }, width: A4.width - 96 },
      { stack: main, margin: [0, HEAD_H + 26, 0, 6] },
    ],
  };
}

/* ====================== TEMPLATE 13 : LAGON (bandes turquoise + timeline) ====================== */
function lagon(c: Content, photo: CvPhoto, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const TEAL = "#04aea1";
  const TEAL_L = "#9fdeda";
  const DARK = "#352c29";
  const HEAD_H = 128;
  const FOOT = 34;
  const img = photo.circle;

  const head: any[] = [];
  if (img) head.push({ image: img, width: 64, margin: [0, 6, 0, 0] });
  head.push({
    stack: [
      { text: c.site.name, bold: true, fontSize: 20, color: "#ffffff", characterSpacing: 1 },
      { text: c.site.role, color: "#c9f2ee", fontSize: 10, margin: [0, 2, 0, 5] },
      { text: contactItems(c).flatMap((it, i, arr) => [{ text: it.abbr + " ", bold: true, fontSize: 6.5, color: "#8fe0d9" }, { text: it.value + (i < arr.length - 1 ? "     " : ""), fontSize: 8, color: "#e7faf8" }]), lineHeight: 1.5 },
    ],
    margin: [14, 0, 0, 0],
  });

  const pill = (t: string) =>
    roundedBox(
      [{ text: t.toUpperCase(), bold: true, fontSize: 10.5, color: "#ffffff", characterSpacing: 1.2, alignment: "center", margin: [0, 3, 0, 3] }],
      TEAL,
      8
    );

  const content: any[] = [];
  content.push(pill("Profil"));
  content.push({ text: data.about, fontSize: 9.5, color: "#4a423d", lineHeight: 1.3, alignment: "justify", margin: [0, 10, 0, 6] });
  content.push(pill("Expériences"));
  for (const e of data.experience) {
    content.push({
      margin: [0, 8, 0, 8],
      stack: [
        {
          columns: [
            { text: e.role, bold: true, fontSize: 10.5, color: DARK, width: "*" },
            { text: e.period, fontSize: 8.5, color: "#9d948d", alignment: "right", width: "auto" },
          ],
        },
        { text: e.company, color: TEAL, fontSize: 9.5, bold: true, margin: [0, 1, 0, 2] },
        { text: e.description, fontSize: 9, color: "#57504a", lineHeight: 1.26 },
      ],
    });
  }
  content.push(pill("Projets"));
  for (const p of data.projects) {
    content.push({ margin: [0, 8, 0, 0], stack: [projectBlock(p, TEAL, DARK, "#57504a", "#9d948d")] });
  }

  return {
    pageMargins: [40, 20, 40, FOOT + 22],
    defaultStyle: { font: "Roboto" },
    background: (page: number) => {
      const canvas: any[] = [];
      if (page === 1) canvas.push({ type: "rect", x: 0, y: 0, w: A4.width, h: HEAD_H, color: TEAL });
      canvas.push({ type: "rect", x: 0, y: A4.height - FOOT, w: A4.width, h: FOOT, color: TEAL });
      return { canvas };
    },
    content: [
      { columns: head, columnGap: 6, absolutePosition: { x: 40, y: 24 }, width: A4.width - 80 },
      {
        columns: [
          { width: 20, canvas: [{ type: "rect", x: 9, y: 0, w: 2, h: 720, color: TEAL_L }], margin: [0, 0, 0, 0] },
          { width: "*", stack: content, margin: [6, HEAD_H - 20 + 18, 0, 6] },
        ],
        columnGap: 0,
      },
    ],
  };
}

/* ====================== TEMPLATE 14 : PRUNE (sidebar violette + cartes blanches) ====================== */
function prune(c: Content, photo: CvPhoto, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const PURPLE = "#892587";
  const PURPLE_L = "#c7a4c6";
  const DARK = "#3b2a3b";
  const SW = 152;
  const img = photo.circle;

  const whiteCard = (title: string, body: any[]) =>
    roundedBox(
      [
        { text: title.toUpperCase(), bold: true, fontSize: 9.5, color: PURPLE, characterSpacing: 1.5, alignment: "center", margin: [0, 7, 0, 4] },
        ...body,
      ],
      "#ffffff",
      7
    );

  const sidebar: any[] = [];
  if (img) sidebar.push({ image: img, width: 88, alignment: "center", margin: [0, 12, 0, 16] });
  sidebar.push(whiteCard("Contact", contactItems(c).flatMap((it) => [
    { text: it.label.toUpperCase(), fontSize: 6, color: "#a58aa6", characterSpacing: 1, alignment: "center", margin: [0, 4, 0, 0] },
    { text: it.value, fontSize: 8, color: DARK, alignment: "center", margin: [0, 0, 0, 1] },
  ])));
  sidebar.push({
    margin: [0, 12, 0, 0],
    stack: [
      whiteCard("Compétences", data.skills.flatMap((cat) => [
        { text: cat.name, bold: true, fontSize: 8, color: PURPLE, alignment: "center", margin: [0, 4, 0, 1] },
        { text: cat.items.join(", "), fontSize: 7.5, color: "#4c3a4c", alignment: "center", lineHeight: 1.2, margin: [0, 0, 0, 2] },
      ])),
    ],
  });

  const pill = (t: string) =>
    roundedBox(
      [{ text: t.toUpperCase(), bold: true, fontSize: 10.5, color: DARK, characterSpacing: 1.5, alignment: "center", margin: [0, 4, 0, 4] }],
      PURPLE_L,
      9
    );

  const main: any[] = [];
  main.push(pill("Profil"));
  main.push({ text: data.about, fontSize: 9.5, color: "#4c4050", lineHeight: 1.3, alignment: "justify", margin: [0, 10, 0, 4] });
  main.push(pill("Expérience"));
  for (const e of data.experience) {
    main.push({
      margin: [0, 8, 0, 8],
      stack: [
        {
          columns: [
            { text: e.role, bold: true, fontSize: 10.5, color: DARK, width: "*" },
            { text: e.period, fontSize: 8.5, color: "#a394a6", alignment: "right", width: "auto" },
          ],
        },
        { text: e.company, color: PURPLE, fontSize: 9.5, bold: true, margin: [0, 1, 0, 2] },
        { text: e.description, fontSize: 9, color: "#57495a", lineHeight: 1.26 },
      ],
    });
  }
  main.push(pill("Projets"));
  for (const p of data.projects) {
    main.push({ margin: [0, 8, 0, 0], stack: [projectBlock(p, PURPLE, DARK, "#57495a", "#a394a6")] });
  }

  return {
    pageMargins: [0, 24, 0, 26],
    defaultStyle: { font: "Roboto" },
    background: () => ({ canvas: [{ type: "rect", x: 0, y: 0, w: SW, h: A4.height, color: PURPLE }] }),
    content: [
      {
        columns: [
          { width: SW, stack: sidebar, margin: [18, 6, 18, 6] },
          { width: "*", stack: main, margin: [24, 10, 28, 6] },
        ],
        columnGap: 0,
      },
    ],
  };
}

const BUILDERS: Record<string, (c: Content, photo: CvPhoto, mode: CvMode) => any> = {
  elegant,
  vibrant,
  solaire,
  coton,
  lin,
  feuillage,
  ardoise,
  obsidienne,
  lagune,
  camee,
  carmin,
  nocturne,
  lagon,
  prune,
};

/** Construit la définition pdfmake (sans dépendre de pdfmake ni d'un DOM). */
export function buildCvDoc(content: Content, templateId: string, photo: CvPhoto, mode: CvMode = "complet"): any {
  return (BUILDERS[templateId] ?? elegant)(content, photo, mode);
}

/* ----------------------- Helpers image (navigateur) ----------------------- */

/** Formes d'avatar disponibles pour les templates (rond ou carré arrondi). */
export interface CvPhoto {
  circle: string | null;
  rounded: string | null;
}

async function urlToDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Recadre une image chargée en cercle ou en carré arrondi (PNG dataURL). */
function cropToDataUrl(img: HTMLImageElement, size: number, shape: "circle" | "rounded", radius = 44): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.save();
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  } else {
    const r = Math.min(radius, size / 2);
    ctx.moveTo(r, 0);
    ctx.arcTo(size, 0, size, size, r);
    ctx.arcTo(size, size, 0, size, r);
    ctx.arcTo(0, size, 0, 0, r);
    ctx.arcTo(0, 0, size, 0, r);
  }
  ctx.closePath();
  ctx.clip();
  const ratio = Math.max(size / img.width, size / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  ctx.restore();
  return canvas.toDataURL("image/png");
}

/** Avatar de repli : dégradé + initiales (cercle ou carré arrondi). */
function initialsAvatar(initials: string, size: number, shape: "circle" | "rounded" = "circle"): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#00b8d4");
  grad.addColorStop(1, "#7c3aed");
  ctx.fillStyle = grad;
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  } else {
    const r = Math.min(0.18 * size, size / 2);
    ctx.moveTo(r, 0);
    ctx.arcTo(size, 0, size, size, r);
    ctx.arcTo(size, size, 0, size, r);
    ctx.arcTo(0, size, 0, 0, r);
    ctx.arcTo(0, 0, size, 0, r);
  }
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${size * 0.4}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((initials || "?").slice(0, 2).toUpperCase(), size / 2, size / 2 + size * 0.02);
  return canvas.toDataURL("image/png");
}

async function getAvatar(content: Content, base: string): Promise<CvPhoto> {
  const fallback = (): CvPhoto => {
    const initials = content.site.initials || content.site.name.charAt(0) || "?";
    try {
      return {
        circle: initialsAvatar(initials, 240, "circle"),
        rounded: initialsAvatar(initials, 240, "rounded"),
      };
    } catch {
      return { circle: null, rounded: null };
    }
  };

  let src: string | null = null;
  if (content.site.photo) {
    src = await urlToDataUrl(assetUrl(content.site.photo, base));
  }
  if (!src) return fallback();
  const img = await loadImage(src);
  if (!img) return fallback();
  try {
    return {
      circle: cropToDataUrl(img, 240, "circle"),
      rounded: cropToDataUrl(img, 240, "rounded"),
    };
  } catch {
    return fallback();
  }
}

async function loadPdfMake(): Promise<any> {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  const pdfMake: any = (pdfMakeModule as any).default ?? pdfMakeModule;
  const fontsExport: any = (pdfFontsModule as any).default ?? pdfFontsModule;
  pdfMake.vfs = fontsExport.pdfMake?.vfs ?? fontsExport.vfs ?? fontsExport;
  return pdfMake;
}

export async function generateCv(content: Content, templateId: string, base = "/", mode: CvMode = "complet") {
  const photo = await getAvatar(content, base);
  const docDefinition = buildCvDoc(content, templateId, photo, mode);
  const pdfMake = await loadPdfMake();

  const filename = `CV-${slug(content.site.name) || "cv"}${mode === "simple" ? "-1page" : ""}.pdf`;
  await new Promise<void>((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).getBlob((blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
}
