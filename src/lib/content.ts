import data from "../data/content.json";

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
}

export interface Experience {
  id: number;
  role: string;
  company: string;
  period: string;
  description: string;
  tech: string[];
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
}

export const content = data as Content;
export default content;

/** Presets de dégradés disponibles (doivent rester dans le safelist Tailwind). */
export const GRADIENT_PRESETS = [
  "bg-gradient-to-br from-neon-cyan/30 to-neon-purple/30",
  "bg-gradient-to-br from-neon-purple/30 to-neon-green/30",
  "bg-gradient-to-br from-neon-green/30 to-neon-cyan/30",
  "bg-gradient-to-br from-neon-cyan/30 to-neon-green/30",
  "bg-gradient-to-br from-neon-purple/30 to-neon-cyan/30",
  "bg-gradient-to-br from-neon-green/30 to-neon-purple/30",
] as const;
