/**
 * Génération de CV en PDF (vrai texte vectoriel) à partir des données du
 * portfolio, avec plusieurs templates. pdfmake est chargé dynamiquement
 * (import()) pour ne pas alourdir le bundle principal du site.
 */
import type { Content } from "../lib/content";

export interface CvTemplate {
  id: string;
  label: string;
  description: string;
}

export const CV_TEMPLATES: CvTemplate[] = [
  { id: "modern", label: "Moderne", description: "En-tête coloré, sections nettes" },
  { id: "minimal", label: "Minimal", description: "Épuré, centré, élégant" },
  { id: "terminal", label: "Terminal", description: "Fond sombre néon, style lab" },
];

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function contactLine(c: Content): string {
  return [c.contact.email, c.contact.location, c.socials.github, c.socials.linkedin]
    .filter((v) => v && v.trim())
    .join("  •  ");
}

function skillsLines(c: Content) {
  return c.skills.map((cat) => ({ name: cat.name, items: cat.items.join(", ") }));
}

/* ============================== TEMPLATE: MODERNE ============================== */
function modern(c: Content): any {
  const accent = "#7C3AED"; // violet lisible à l'impression
  const sub = "#0E7490"; // cyan foncé
  const heading = (txt: string) => ({
    text: txt.toUpperCase(),
    style: "h2",
    color: accent,
    margin: [0, 14, 0, 6],
  });
  return {
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: "Roboto", fontSize: 10, color: "#1f2937", lineHeight: 1.25 },
    styles: {
      name: { fontSize: 26, bold: true, color: "#0f172a" },
      role: { fontSize: 12, color: sub, bold: true },
      h2: { fontSize: 11, bold: true, characterSpacing: 1 },
      itemTitle: { fontSize: 11, bold: true, color: "#0f172a" },
      meta: { fontSize: 9, color: "#6b7280", italics: true },
      tech: { fontSize: 8.5, color: sub },
    },
    content: [
      { text: c.site.name, style: "name" },
      { text: c.site.role, style: "role", margin: [0, 2, 0, 6] },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: accent }] },
      { text: contactLine(c), style: "meta", margin: [0, 6, 0, 0] },

      heading("Profil"),
      { text: c.about.paragraphs[0] || c.hero.tagline },

      heading("Expérience"),
      ...c.experience.map((e) => ({
        margin: [0, 0, 0, 8],
        stack: [
          {
            columns: [
              { text: `${e.role} — ${e.company}`, style: "itemTitle" },
              { text: e.period, style: "meta", alignment: "right" },
            ],
          },
          { text: e.description, margin: [0, 2, 0, 2] },
          { text: e.tech.join(" · "), style: "tech" },
        ],
      })),

      heading("Compétences"),
      ...skillsLines(c).map((s) => ({
        margin: [0, 0, 0, 3],
        text: [{ text: `${s.name} : `, bold: true, color: "#0f172a" }, { text: s.items }],
      })),

      heading("Projets"),
      ...c.projects.slice(0, 5).map((p) => ({
        margin: [0, 0, 0, 4],
        text: [
          { text: `${p.name} `, bold: true, color: "#0f172a" },
          { text: `(${p.year}) `, style: "meta" },
          { text: `— ${p.shortDesc}` },
        ],
      })),
    ],
  };
}

/* ============================== TEMPLATE: MINIMAL ============================== */
function minimal(c: Content): any {
  const rule = (m = 10): any => ({
    canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#d1d5db" }],
    margin: [0, m, 0, m],
  });
  const heading = (txt: string) => ({
    text: txt.toUpperCase(),
    fontSize: 10,
    bold: true,
    characterSpacing: 2,
    color: "#111827",
    margin: [0, 10, 0, 6],
  });
  return {
    pageMargins: [55, 50, 55, 50],
    defaultStyle: { font: "Roboto", fontSize: 10, color: "#374151", lineHeight: 1.3 },
    content: [
      { text: c.site.name, fontSize: 24, bold: true, alignment: "center", color: "#111827" },
      { text: c.site.role, fontSize: 11, alignment: "center", color: "#6b7280", margin: [0, 3, 0, 6] },
      { text: contactLine(c), fontSize: 8.5, alignment: "center", color: "#9ca3af" },
      rule(14),

      heading("Profil"),
      { text: c.about.paragraphs[0] || c.hero.tagline },

      heading("Expérience"),
      ...c.experience.map((e) => ({
        margin: [0, 0, 0, 8],
        stack: [
          {
            columns: [
              { text: `${e.role}`, bold: true, color: "#111827" },
              { text: e.period, alignment: "right", fontSize: 9, color: "#9ca3af" },
            ],
          },
          { text: e.company, italics: true, fontSize: 9.5, color: "#6b7280" },
          { text: e.description, margin: [0, 2, 0, 0] },
        ],
      })),

      heading("Compétences"),
      ...skillsLines(c).map((s) => ({
        margin: [0, 0, 0, 3],
        text: [{ text: `${s.name} — `, bold: true, color: "#111827" }, { text: s.items }],
      })),

      heading("Projets"),
      {
        ul: c.projects.slice(0, 5).map((p) => `${p.name} (${p.year}) — ${p.shortDesc}`),
      },
    ],
  };
}

/* ============================== TEMPLATE: TERMINAL ============================= */
function terminal(c: Content): any {
  const bg = "#0b0f17";
  const cyan = "#00f0ff";
  const green = "#00ff9d";
  const purple = "#c084fc";
  const gray = "#9aa4b2";
  const heading = (txt: string) => ({
    text: [{ text: "// ", color: green }, { text: txt, color: "#ffffff" }],
    fontSize: 12,
    bold: true,
    margin: [0, 14, 0, 6],
  });
  return {
    pageMargins: [44, 44, 44, 44],
    background: () => ({ canvas: [{ type: "rect", x: 0, y: 0, w: 595.28, h: 841.89, color: bg }] }),
    defaultStyle: { font: "Roboto", fontSize: 10, color: gray, lineHeight: 1.3 },
    content: [
      { text: "$ whoami", color: green, fontSize: 10 },
      { text: c.site.name, fontSize: 26, bold: true, color: "#ffffff", margin: [0, 2, 0, 0] },
      { text: c.site.role, fontSize: 12, color: cyan, margin: [0, 2, 0, 6] },
      { text: contactLine(c), fontSize: 8.5, color: gray },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 507, y2: 0, lineWidth: 1, lineColor: "#1c2230" }], margin: [0, 8, 0, 0] },

      heading("profil"),
      { text: c.about.paragraphs[0] || c.hero.tagline },

      heading("experience"),
      ...c.experience.map((e) => ({
        margin: [0, 0, 0, 8],
        stack: [
          {
            columns: [
              { text: `${e.role} @ ${e.company}`, bold: true, color: "#ffffff" },
              { text: e.period, alignment: "right", color: purple, fontSize: 9 },
            ],
          },
          { text: e.description, margin: [0, 2, 0, 2] },
          { text: e.tech.map((t) => `[${t}]`).join(" "), color: cyan, fontSize: 8.5 },
        ],
      })),

      heading("skills"),
      ...skillsLines(c).map((s) => ({
        margin: [0, 0, 0, 3],
        text: [{ text: `${s.name}: `, bold: true, color: green }, { text: s.items, color: gray }],
      })),

      heading("projects"),
      ...c.projects.slice(0, 5).map((p) => ({
        margin: [0, 0, 0, 4],
        text: [
          { text: "▸ ", color: cyan },
          { text: `${p.name} `, bold: true, color: "#ffffff" },
          { text: `(${p.year}) `, color: purple },
          { text: `— ${p.shortDesc}`, color: gray },
        ],
      })),
    ],
  };
}

const BUILDERS: Record<string, (c: Content) => any> = { modern, minimal, terminal };

/** Construit la définition de document pdfmake (sans dépendre de pdfmake). */
export function buildCvDoc(content: Content, templateId: string): any {
  return (BUILDERS[templateId] ?? modern)(content);
}

export async function generateCv(content: Content, templateId: string) {
  const docDefinition = buildCvDoc(content, templateId);

  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  const pdfMake: any = (pdfMakeModule as any).default ?? pdfMakeModule;
  // Selon le bundler, vfs_fonts expose soit { pdfMake: { vfs } }, soit { vfs },
  // soit directement l'objet vfs (cas de pdfmake 0.2.x).
  const fontsExport: any = (pdfFontsModule as any).default ?? pdfFontsModule;
  pdfMake.vfs = fontsExport.pdfMake?.vfs ?? fontsExport.vfs ?? fontsExport;

  const filename = `CV-${slug(content.site.name) || "cv"}.pdf`;
  pdfMake.createPdf(docDefinition).download(filename);
}
