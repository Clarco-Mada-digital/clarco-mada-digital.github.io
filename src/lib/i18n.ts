/**
 * Bilinguisme français / anglais.
 *
 * Le français reste la langue par défaut, servie à la racine ; l'anglais vit
 * sous /en/. Le préfixe d'URL (plutôt qu'une bascule côté client) donne deux
 * pages distinctes, indexables et partageables — ce qui compte quand la cible
 * est un recruteur qui envoie un lien.
 *
 * La langue se déduit du chemin : aucun composant n'a besoin de recevoir la
 * locale en propriété, ce qui évite de la faire descendre à travers toute
 * l'arborescence.
 */

export type Locale = "fr" | "en";

export const LOCALES: Locale[] = ["fr", "en"];
export const DEFAULT_LOCALE: Locale = "fr";

/** Déduit la langue d'une URL. Tout ce qui n'est pas sous /en/ est français. */
export function getLocale(pathname: string): Locale {
  const p = pathname.replace(/^\/+/, "/");
  return /(^|\/)en(\/|$)/.test(p) ? "en" : "fr";
}

/**
 * Construit le chemin d'une page dans une langue donnée.
 * `path` est relatif à la racine du site, sans slash initial ("", "blog", …).
 */
export function localePath(locale: Locale, path = "", base = "/"): string {
  const b = base.endsWith("/") ? base : base + "/";
  const clean = path.replace(/^\//, "");
  const prefix = locale === DEFAULT_LOCALE ? "" : `${locale}/`;
  return `${b}${prefix}${clean}`;
}

/** Libellés d'interface. Les textes de contenu vivent dans content.json. */
const UI = {
  fr: {
    "nav.home": "Accueil",
    "nav.about": "À propos",
    "nav.skills": "Compétences",
    "nav.projects": "Projets",
    "nav.labs": "Labs",
    "nav.experience": "Parcours",
    "nav.contact": "Contact",
    "nav.blog": "Blog",

    "section.about": "// À propos",
    "section.skills": "// Compétences",
    "section.projects": "// Projets",
    "section.labs": "// Labs",
    "section.experience": "// Parcours",
    "section.contact": "// Contact",

    "fn.about": "getPersonalInfo()",
    "fn.skills": "getTechStack()",
    "fn.projects": "getProjects(limit: 'all')",
    "fn.labs": "runExperiments()",
    "fn.experience": "getExperience()",
    "fn.contact": "initiateContact()",

    "home.viewProjects": "Voir mes projets",
    "home.contactMe": "Me contacter",
    "home.downloadCv": "Télécharger mon CV",
    "contact.location": "Localisation",
    "contact.statusLabel": "Statut",
    "about.doing": "Ce que je fais",
    "about.looking": "Ce que je cherche",
    "skills.tools": "🛠️ Outils & Workflow",

    "projects.all": "Tous",
    "projects.viewCode": "Voir le code",
    "projects.liveDemo": "Démo live",
    "projects.context": "Le contexte",
    "projects.decisions": "Décisions techniques",
    "projects.outcome": "Où ça en est",
    "projects.problem": "Problème —",
    "projects.decision": "Décision —",
    "projects.result": "Résultat —",
    "projects.features": "Fonctionnalités clés",
    "projects.gallery": "Galerie",
    "projects.open": "Voir le projet",
    "projects.noLinks": "Liens à venir",

    "labs.intro":
      "Mon bac à sable : prototypes, tests d'API, mini-projets et idées en vrac. Chaque démo tourne",
    "labs.introLive": "en vrai",
    "labs.introEnd": ", directement ci-dessous. 🧪",
    "labs.viewCode": "Voir le code",
    "labs.empty": "— vide —",
    "labs.enlarge": "⛶ Agrandir",
    "labs.loading": "chargement de la démo…",
    "labs.argusTitle": "Analysez",
    "labs.argusHighlight": "votre propre projet",
    "labs.argusTitleEnd": "avec Argus",
    "labs.argusText":
      "Mon analyseur de code tourne entièrement dans le navigateur : choisissez un dossier, il en sort un rapport noté. Vos fichiers ne quittent pas votre machine.",
    "labs.argusCta": "Essayer →",

    "contact.title": "Travaillons ensemble !",
    "contact.name": "Nom",
    "contact.email": "Email",
    "contact.message": "Message",
    "contact.send": "Envoyer le message",
    "contact.sending": "Envoi…",
    "contact.sent": "Message envoyé !",
    "contact.again": "Envoyer un autre message",

    "cv.generate": "Générer mon CV",
    "cv.full": "(tout, 1-2 pages)",
    "cv.simple": "(condensé, 1 page)",
    "cv.imported": "Mon CV importé",
    "cv.importedNote": "Le fichier PDF que j'ai fourni",

    "palette.goto": "Aller :",
    "palette.blog": "Lire le blog",
    "palette.cv": "Générer mon CV",
    "palette.customize": "Personnaliser l'apparence",
    "palette.toDark": "Passer en mode sombre",
    "palette.toLight": "Passer en mode clair",
    "palette.github": "Ouvrir GitHub",
    "palette.linkedin": "Ouvrir LinkedIn",
    "palette.email": "M'écrire un email",
    "palette.project": "Projet :",
    "palette.lab": "Labo :",
    "ui.search": "Rechercher",
    "ui.searchPlaceholder": "Rechercher une page, un projet, une action…",
    "ui.customize": "Personnaliser",
    "ui.font": "Police",
    "ui.palette": "Palette",
    "ui.mood": "Ambiance",
    "ui.close": "Fermer",
    "ui.open": "ouvrir",
    "ui.navigate": "naviguer",
    "ui.stored": "mémorisé sur cet appareil",
    "ui.dark": "Sombre",
    "ui.light": "Clair",
    "ui.lightMode": "Mode clair",
    "ui.darkMode": "Mode sombre",
    "ui.skip": "Aller au contenu",
    "ui.backToPortfolio": "← Portfolio",
    "ui.copyLink": "Copier le lien",
    "ui.langSwitch": "English",

    "footer.built": "Conçu et développé avec ❤️ par",
  },

  en: {
    "nav.home": "Home",
    "nav.about": "About",
    "nav.skills": "Skills",
    "nav.projects": "Projects",
    "nav.labs": "Labs",
    "nav.experience": "Experience",
    "nav.contact": "Contact",
    "nav.blog": "Blog",

    "section.about": "// About",
    "section.skills": "// Skills",
    "section.projects": "// Projects",
    "section.labs": "// Labs",
    "section.experience": "// Experience",
    "section.contact": "// Contact",

    "fn.about": "getPersonalInfo()",
    "fn.skills": "getTechStack()",
    "fn.projects": "getProjects(limit: 'all')",
    "fn.labs": "runExperiments()",
    "fn.experience": "getExperience()",
    "fn.contact": "initiateContact()",

    "home.viewProjects": "View my projects",
    "home.contactMe": "Get in touch",
    "home.downloadCv": "Download my CV",
    "contact.location": "Location",
    "contact.statusLabel": "Status",
    "about.doing": "What I do",
    "about.looking": "What I'm looking for",
    "skills.tools": "🛠️ Tools & Workflow",

    "projects.all": "All",
    "projects.viewCode": "View code",
    "projects.liveDemo": "Live demo",
    "projects.context": "The context",
    "projects.decisions": "Technical decisions",
    "projects.outcome": "Where it stands",
    "projects.problem": "Problem —",
    "projects.decision": "Decision —",
    "projects.result": "Result —",
    "projects.features": "Key features",
    "projects.gallery": "Gallery",
    "projects.open": "View project",
    "projects.noLinks": "Links coming soon",

    "labs.intro":
      "My sandbox: prototypes, API experiments, small projects and loose ideas. Every demo runs",
    "labs.introLive": "for real",
    "labs.introEnd": ", right below. 🧪",
    "labs.viewCode": "View code",
    "labs.empty": "— empty —",
    "labs.enlarge": "⛶ Enlarge",
    "labs.loading": "loading demo…",
    "labs.argusTitle": "Analyse",
    "labs.argusHighlight": "your own project",
    "labs.argusTitleEnd": "with Argus",
    "labs.argusText":
      "My code analyser runs entirely in the browser: pick a folder and it produces a scored report. Your files never leave your machine.",
    "labs.argusCta": "Try it →",

    "contact.title": "Let's work together!",
    "contact.name": "Name",
    "contact.email": "Email",
    "contact.message": "Message",
    "contact.send": "Send message",
    "contact.sending": "Sending…",
    "contact.sent": "Message sent!",
    "contact.again": "Send another message",

    "cv.generate": "Generate my CV",
    "cv.full": "(full, 1-2 pages)",
    "cv.simple": "(condensed, 1 page)",
    "cv.imported": "My uploaded CV",
    "cv.importedNote": "The PDF file I provided",

    "palette.goto": "Go to:",
    "palette.blog": "Read the blog",
    "palette.cv": "Generate my CV",
    "palette.customize": "Customise the appearance",
    "palette.toDark": "Switch to dark mode",
    "palette.toLight": "Switch to light mode",
    "palette.github": "Open GitHub",
    "palette.linkedin": "Open LinkedIn",
    "palette.email": "Email me",
    "palette.project": "Project:",
    "palette.lab": "Lab:",
    "ui.search": "Search",
    "ui.searchPlaceholder": "Search a page, a project, an action…",
    "ui.customize": "Customise",
    "ui.font": "Font",
    "ui.palette": "Palette",
    "ui.mood": "Mood",
    "ui.close": "Close",
    "ui.open": "open",
    "ui.navigate": "navigate",
    "ui.stored": "stored on this device",
    "ui.dark": "Dark",
    "ui.light": "Light",
    "ui.lightMode": "Light mode",
    "ui.darkMode": "Dark mode",
    "ui.skip": "Skip to content",
    "ui.backToPortfolio": "← Portfolio",
    "ui.copyLink": "Copy link",
    "ui.langSwitch": "Français",

    "footer.built": "Designed and built with ❤️ by",
  },
} as const;

export type UIKey = keyof (typeof UI)["fr"];

/** Traduit une clé. Retombe sur le français si la clé manque en anglais. */
export function t(locale: Locale, key: UIKey): string {
  return (UI[locale] as Record<string, string>)[key] ?? UI.fr[key] ?? key;
}

/** Raccourci pratique : `const tr = useT(locale)` puis `tr("nav.home")`. */
export function useT(locale: Locale) {
  return (key: UIKey) => t(locale, key);
}
