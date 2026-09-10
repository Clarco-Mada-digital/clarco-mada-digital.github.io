import data from "../data/content.json";
import overridesEn from "../data/content.en.json";
import type { Locale } from "./i18n";

export interface Stat {
  value: string;
  label: string;
  color: string;
}

export interface SkillCategory {
  name: string;
  icon: string;
  items: string[];
}

export interface Project {
  id: number;
  name: string;
  year: string;
  featured?: boolean;
  shortDesc: string;
  fullDesc: string;
  tags: string[];
  gradient: string;
  repoUrl?: string;
  demoUrl?: string;
  /** Image de couverture (URL externe ou chemin local type /projects/foo.jpg). */
  cover?: string;
  /** Images de démo affichées dans la modale. */
  gallery?: string[];
  features: string[];
  /**
   * Étude de cas détaillée, affichée dans la modale. Optionnelle : réservée
   * aux projets qui ont une vraie histoire technique — une contrainte, un
   * arbitrage, un résultat — plutôt qu'une liste de fonctionnalités.
   */
  caseStudy?: {
    context: string;
    challenges: { title: string; problem: string; decision: string; result: string }[];
    outcome: string;
  };
  /** Projet personnel (side-project) ou réalisé en contexte professionnel. */
  category?: "perso" | "pro";
  /** Entreprise / client pour lequel le projet a été réalisé (si category = "pro"). */
  company?: string;
  /** Statut pro : salarié ou freelance (si category = "pro"). */
  employment?: "salarie" | "freelance";
  /** Inclure ce projet dans le CV généré (case cochée par défaut). */
  includeInCv?: boolean;
}

export interface Experience {
  id: number;
  role: string;
  company: string;
  period: string;
  description: string;
  tech: string[];
}

/** Expérimentation / projet "extra" affiché dans la section Labs. */
export interface Lab {
  id: number;
  title: string;
  /** Une phrase : ce que j'ai testé + ce que j'ai appris. */
  tagline: string;
  /** État du labo : pilote le badge couleur. */
  status: "wip" | "done" | "idea";
  tags: string[];
  /** Lien démo / CodePen / repo (optionnel). */
  url?: string;
  /** Émoji d'illustration (optionnel). */
  emoji?: string;
  /** Démo live exécutée dans un iframe sandboxé (façon CodePen). */
  demo?: {
    html?: string;
    css?: string;
    js?: string;
  };
}

export interface Content {
  site: {
    name: string;
    handle: string;
    initials: string;
    role: string;
    titleTag: string;
    description: string;
    available: boolean;
    availabilityLabel: string;
    /** Lien vers le CV (URL externe ou chemin local type /cv/cv.pdf). Vide = bouton masqué. */
    cvUrl?: string;
    /** Photo de profil (URL ou chemin local type /profile/photo.jpg). Utilisée sur le CV. */
    photo?: string;
  };
  hero: {
    tagline: string;
    code: {
      name: string;
      role: string;
      location: string;
      stack: string[];
      passions: string;
      available: boolean;
    };
  };
  stats: Stat[];
  about: {
    paragraphs: string[];
    doing: string[];
    looking: string[];
  };
  skills: SkillCategory[];
  tools: string[];
  projects: Project[];
  labs: Lab[];
  experience: Experience[];
  contact: {
    intro: string;
    email: string;
    phone?: string;
    location: string;
    status: string;
    /** Endpoint Formspree (optionnel). */
    formEndpoint: string;
    /** Clé d'accès Web3Forms (optionnel, recommandé). */
    web3formsKey?: string;
  };
  socials: {
    github: string;
    linkedin: string;
    email: string;
  };
  /** Analytics (optionnel). */
  analytics?: {
    /** Token Cloudflare Web Analytics (beacon JS). Public par conception. */
    cloudflareToken?: string;
  };
}

export const content = data as Content;
export default content;

/* ------------------------------------------------------------------ */
/*  Localisation du contenu                                            */
/* ------------------------------------------------------------------ */

/**
 * Fusionne les traductions par-dessus le contenu français.
 *
 * `content.en.json` ne contient que ce qui diffère : une valeur absente
 * retombe sur le français, ce qui évite de dupliquer les 36 Ko de projets
 * pour n'en traduire que deux champs, et laisse le site cohérent même si une
 * traduction manque.
 *
 * Les tableaux de projets et de labos sont appariés par `id`, jamais par
 * position : réordonner un projet dans l'admin ne doit pas décaler les
 * traductions.
 */
function mergeTranslations<T>(base: T, over: unknown): T {
  if (over === undefined || over === null) return base;
  if (Array.isArray(base)) {
    if (!Array.isArray(over)) return base;
    const byId = new Map<unknown, unknown>();
    for (const o of over) {
      if (o && typeof o === "object" && "id" in (o as Record<string, unknown>)) {
        byId.set((o as Record<string, unknown>).id, o);
      }
    }
    return base.map((item, i) => {
      const key = item && typeof item === "object" ? (item as Record<string, unknown>).id : undefined;
      const match = key !== undefined ? byId.get(key) : over[i];
      return mergeTranslations(item, match);
    }) as unknown as T;
  }
  if (base && typeof base === "object" && over && typeof over === "object") {
    const out = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
      if (k === "id") continue;
      out[k] = mergeTranslations((base as Record<string, unknown>)[k], v);
    }
    return out as T;
  }
  return (over as T) ?? base;
}

const localized: Record<Locale, Content> = {
  fr: content,
  en: mergeTranslations(content, overridesEn),
};

/** Contenu du site dans la langue demandée. */
export function getContent(locale: Locale): Content {
  return localized[locale] ?? content;
}

/** Presets de dégradés disponibles (doivent rester dans le safelist Tailwind). */
export const GRADIENT_PRESETS = [
  "bg-gradient-to-br from-neon-cyan/30 to-neon-purple/30",
  "bg-gradient-to-br from-neon-purple/30 to-neon-green/30",
  "bg-gradient-to-br from-neon-green/30 to-neon-cyan/30",
  "bg-gradient-to-br from-neon-cyan/30 to-neon-green/30",
  "bg-gradient-to-br from-neon-purple/30 to-neon-cyan/30",
  "bg-gradient-to-br from-neon-green/30 to-neon-purple/30",
] as const;
