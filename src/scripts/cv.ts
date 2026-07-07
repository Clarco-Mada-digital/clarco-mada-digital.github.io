/**
 * Génération de CV en PDF (vrai texte vectoriel) à partir des données du
 * portfolio, avec plusieurs templates GRAPHIQUES (photo, bandeau/sidebar
 * coloré, en-têtes de section colorés, mise en page deux colonnes).
 * pdfmake est chargé dynamiquement pour ne pas alourdir le bundle.
 */
import { assetUrl } from "../lib/url";
import type { Content } from "../lib/content";

export interface CvTemplate {
  id: string;
  label: string;
  description: string;
  color: string; // couleur d'accent pour l'aperçu
}

export const CV_TEMPLATES: CvTemplate[] = [
  { id: "elegant", label: "Élégant", description: "Sidebar sombre + photo, sobre et pro", color: "#0d9488" },
  { id: "vibrant", label: "Vibrant", description: "Grand bandeau coloré + photo ronde", color: "#4f46e5" },
  { id: "rose", label: "Rosé", description: "Sidebar colorée, moderne et chaleureux", color: "#be185d" },
];

const A4 = { width: 595.28, height: 841.89 };

/** Retire les balises HTML (les paragraphes "À propos" peuvent en contenir). */
function stripHtml(s: string): string {
  return (s || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

/** Tronque un texte à n caractères (mode "simple", pour tenir sur 1 page). */
function truncate(s: string, n: number): string {
  const t = (s || "").trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1).trimEnd() + "…";
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
  const aboutFull = stripHtml(c.about.paragraphs[0] || c.hero.tagline);
  if (mode === "simple") {
    return {
      projects: sorted.slice(0, 3),
      experience: c.experience.slice(0, 1),
      skills: c.skills.slice(0, 2).map((cat) => ({ ...cat, items: cat.items.slice(0, 6) })),
      about: truncate(aboutFull, 200),
    };
  }
  return { projects: sorted, experience: c.experience, skills: c.skills, about: aboutFull };
}

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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
    { text: p.shortDesc, fontSize: 9, color: descColor, lineHeight: 1.22 },
  ];
  if (p.tags?.length) stack.push({ text: p.tags.slice(0, 4).join("  ·  "), fontSize: 7.5, color: mutedColor, margin: [0, 2, 0, 0] });
  return { margin: [0, 0, 0, 8], stack };
}

/* ====================== TEMPLATE 1 : ÉLÉGANT (sidebar sombre) ====================== */
function elegant(c: Content, photo: string | null, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const SIDE = "#2b2d42";
  const ACCENT = "#0d9488";
  const SW = 200; // largeur sidebar
  const light = "#cbd2dc";

  const sideHeading = (t: string) => ({
    text: t.toUpperCase(),
    color: "#ffffff",
    bold: true,
    fontSize: 10,
    characterSpacing: 1,
    margin: [0, 14, 0, 4],
  });
  // Fonction (pas un objet constant) : pdfmake annote l'objet avec sa position calculée,
  // donc réutiliser la même référence à 2 endroits déplace le second trait au mauvais endroit.
  const sideRule = () => ({
    canvas: [{ type: "line", x1: 0, y1: 0, x2: SW - 44, y2: 0, lineWidth: 1, lineColor: ACCENT }],
    margin: [0, 0, 0, 6],
  });
  const mainHeading = (t: string) => ({
    columns: [
      { width: 4, canvas: [{ type: "rect", x: 0, y: 1, w: 4, h: 14, color: ACCENT }] },
      { text: t.toUpperCase(), bold: true, fontSize: 13, color: "#1f2937", margin: [8, 0, 0, 0], characterSpacing: 0.5 },
    ],
    margin: [0, 16, 0, 8],
  });

  const sidebar: any[] = [];
  if (photo) sidebar.push({ image: photo, width: 110, alignment: "center", margin: [0, 0, 0, 12] });
  sidebar.push({ text: c.site.name, color: "#ffffff", bold: true, fontSize: 17, alignment: "center" });
  sidebar.push({ text: c.site.role, color: ACCENT, fontSize: 10, alignment: "center", margin: [0, 2, 0, 4] });

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
    pageMargins: [0, 0, 0, 0],
    defaultStyle: { font: "Roboto" },
    background: () => ({ canvas: [{ type: "rect", x: 0, y: 0, w: SW, h: A4.height, color: SIDE }] }),
    content: [
      {
        columns: [
          { width: SW, stack: sidebar, margin: [22, 28, 22, 24] },
          { width: "*", stack: main, margin: [22, 30, 28, 24] },
        ],
        columnGap: 0,
      },
    ],
  };
}

/* ====================== TEMPLATE 2 : VIBRANT (bandeau coloré) ====================== */
function vibrant(c: Content, photo: string | null, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const BANNER = "#4f46e5";
  const ACCENT = "#4f46e5";
  const BANNER_H = 215;

  const TOP_MARGIN = 30;

  const head: any[] = [];
  if (photo) head.push({ image: photo, width: 78, alignment: "center", margin: [0, 0, 0, 7] });
  head.push({ text: c.site.name, color: "#ffffff", bold: true, fontSize: 22, alignment: "center", characterSpacing: 1 });
  head.push({ text: c.site.role, color: "#dbeafe", fontSize: 10.5, alignment: "center", margin: [0, 2, 0, 9] });
  head.push({
    text: contactItems(c).flatMap((it, i, arr) => [
      { text: it.abbr + " ", bold: true, fontSize: 7, color: "#c7d2fe" },
      { text: it.value + (i < arr.length - 1 ? "     " : ""), fontSize: 8.5, color: "#eef2ff" },
    ]),
    alignment: "center",
    lineHeight: 1.6,
  });

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
    // Marges normales sur TOUTES les pages : le bandeau (page 1 seulement) est peint en
    // fond (background) et l'en-tête est positionné en absolu par-dessus, donc il ne
    // consomme aucun espace de mise en page — ça évite le grand vide en haut des pages
    // suivantes qu'on aurait avec une marge haute permanente de la taille du bandeau.
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
        // Pousse le contenu sous le bandeau — une seule fois, en haut du flux, donc les
        // pages suivantes démarrent normalement à TOP_MARGIN.
        margin: [0, BANNER_H - TOP_MARGIN + 14, 0, 0],
      },
    ],
  };
}

/* ====================== TEMPLATE 3 : ROSÉ (sidebar colorée) ====================== */
function rose(c: Content, photo: string | null, mode: CvMode): any {
  const data = prepareCvData(c, mode);
  const SIDE = "#be185d";
  const SW = 205;
  const lightText = "#fce7f0";

  const sideHeading = (t: string) => ({
    table: {
      widths: ["*"],
      body: [[{ text: t.toUpperCase(), color: SIDE, bold: true, fontSize: 9.5, fillColor: "#ffffff", margin: [6, 3, 6, 3], characterSpacing: 1 }]],
    },
    layout: "noBorders",
    margin: [0, 14, 0, 6],
  });
  const mainHeading = (t: string) => ({
    table: {
      widths: ["*"],
      body: [[{ text: t.toUpperCase(), color: "#ffffff", bold: true, fontSize: 11, fillColor: SIDE, margin: [8, 4, 8, 4], characterSpacing: 1 }]],
    },
    layout: "noBorders",
    margin: [0, 14, 0, 8],
  });

  const sidebar: any[] = [];
  if (photo) sidebar.push({ image: photo, width: 120, alignment: "center", margin: [0, 0, 0, 10] });
  sidebar.push({ text: c.site.name, color: "#ffffff", bold: true, fontSize: 16, alignment: "center" });
  sidebar.push({ text: c.site.role, color: lightText, fontSize: 9.5, alignment: "center", margin: [0, 2, 0, 0] });

  sidebar.push(sideHeading("Contact"));
  for (const it of contactItems(c)) {
    sidebar.push(contactChip(it, "#ffffff", SIDE, lightText));
  }
  sidebar.push(sideHeading("Compétences"));
  for (const cat of data.skills) {
    sidebar.push({ text: cat.name, color: "#ffffff", fontSize: 9, bold: true, margin: [0, 5, 0, 1] });
    sidebar.push({ text: cat.items.join(", "), color: lightText, fontSize: 8.5, lineHeight: 1.2 });
  }

  const main: any[] = [];
  main.push(mainHeading("Profil"));
  main.push({ text: data.about, fontSize: 10, color: "#374151", lineHeight: 1.3 });
  main.push(mainHeading("Expérience professionnelle"));
  for (const e of data.experience) {
    main.push({
      margin: [0, 0, 0, 9],
      stack: [
        { text: e.role, bold: true, fontSize: 11, color: "#1f2937" },
        {
          columns: [
            { text: e.company, color: SIDE, fontSize: 9.5, bold: true, width: "*" },
            { text: e.period, fontSize: 8.5, color: "#9ca3af", alignment: "right", width: "auto" },
          ],
          margin: [0, 1, 0, 2],
        },
        { text: e.description, fontSize: 9.5, color: "#4b5563", lineHeight: 1.25 },
      ],
    });
  }
  main.push(mainHeading("Projets"));
  for (const p of data.projects) {
    main.push(projectBlock(p, SIDE, "#1f2937", "#4b5563", "#9ca3af"));
  }

  return {
    pageMargins: [0, 0, 0, 0],
    defaultStyle: { font: "Roboto" },
    background: () => ({ canvas: [{ type: "rect", x: 0, y: 0, w: SW, h: A4.height, color: SIDE }] }),
    content: [
      {
        columns: [
          { width: SW, stack: sidebar, margin: [20, 26, 20, 22] },
          { width: "*", stack: main, margin: [22, 28, 28, 22] },
        ],
        columnGap: 0,
      },
    ],
  };
}

const BUILDERS: Record<string, (c: Content, photo: string | null, mode: CvMode) => any> = {
  elegant,
  vibrant,
  rose,
};

/** Construit la définition pdfmake (sans dépendre de pdfmake ni d'un DOM). */
export function buildCvDoc(content: Content, templateId: string, photo: string | null = null, mode: CvMode = "complet"): any {
  return (BUILDERS[templateId] ?? elegant)(content, photo, mode);
}

/* ----------------------- Helpers image (navigateur) ----------------------- */
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

/** Recadre une image en cercle (PNG dataURL). */
async function circleCrop(dataUrl: string, size = 240): Promise<string | null> {
  const img = await loadImage(dataUrl);
  if (!img) return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const ratio = Math.max(size / img.width, size / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  ctx.restore();
  return canvas.toDataURL("image/png");
}

/** Avatar de repli : cercle dégradé + initiales. */
function initialsAvatar(initials: string, size = 240): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#00b8d4");
  grad.addColorStop(1, "#7c3aed");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${size * 0.4}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((initials || "?").slice(0, 2).toUpperCase(), size / 2, size / 2 + size * 0.02);
  return canvas.toDataURL("image/png");
}

async function getAvatar(content: Content, base: string): Promise<string | null> {
  if (content.site.photo) {
    const data = await urlToDataUrl(assetUrl(content.site.photo, base));
    if (data) {
      const cropped = await circleCrop(data);
      if (cropped) return cropped;
    }
  }
  try {
    return initialsAvatar(content.site.initials || content.site.name.charAt(0));
  } catch {
    return null;
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
