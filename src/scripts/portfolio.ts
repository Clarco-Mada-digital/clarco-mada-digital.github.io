import Alpine from "alpinejs";
import { refreshReveal } from "./effects";
import { assetUrl } from "../lib/url";
import { generateCv, CV_TEMPLATES } from "./cv";
import {
  FONT_PAIRINGS,
  COLOR_THEMES,
  DEFAULT_FONT,
  DEFAULT_THEME,
  STORAGE,
} from "../lib/customize";
import type { Project, Content } from "../lib/content";

interface PortfolioBootstrap {
  projects: Project[];
  tagline: string;
  formEndpoint: string;
  email: string;
  base: string;
  content: Content;
}

declare global {
  interface Window {
    Alpine: typeof Alpine;
    __PORTFOLIO__: PortfolioBootstrap;
  }
}

function portfolioApp() {
  const boot: PortfolioBootstrap = window.__PORTFOLIO__ ?? {
    projects: [],
    tagline: "",
    formEndpoint: "",
    email: "",
    base: "/",
    content: null as unknown as Content,
  };

  return {
    activeView: "home",
    selectedProject: null as Project | null,
    lightbox: null as string | null,
    cvOpen: false,
    // null (et pas "") : Alpine considère "" comme vrai pour :disabled.
    cvBusy: null as string | null,
    cvTemplates: CV_TEMPLATES,
    customCv: boot.content?.site?.cvUrl || "",
    isLight:
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("light"),
    // --- Personnaliseur visiteur (police + palette) ---
    customizeOpen: false,
    fontPairings: FONT_PAIRINGS,
    colorThemes: COLOR_THEMES,
    fontId: DEFAULT_FONT,
    paletteId: DEFAULT_THEME,
    formSent: false,
    formSending: false,
    formError: "",
    form: { name: "", email: "", message: "", botcheck: "" },
    typedText: "",
    fullText: boot.tagline,
    projects: boot.projects,

    init() {
      // Permet d'ouvrir une vue directement via le hash (#projects, ...).
      const hash = window.location.hash.replace("#", "");
      if (hash && document.querySelector(`[x-show="activeView === '${hash}'"]`)) {
        this.activeView = hash;
      }
      // Synchronise l'état du personnaliseur (le CSS est déjà appliqué par
      // le script inline du <head>).
      try {
        this.fontId = localStorage.getItem(STORAGE.fontId) || DEFAULT_FONT;
        this.paletteId = localStorage.getItem(STORAGE.themeId) || DEFAULT_THEME;
      } catch {
        /* ignore */
      }
      this.typeWriter();
    },

    typeWriter() {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        this.typedText = this.fullText;
        return;
      }
      let i = 0;
      const interval = setInterval(() => {
        if (i < this.fullText.length) {
          this.typedText += this.fullText.charAt(i);
          i++;
        } else {
          clearInterval(interval);
        }
      }, 30);
    },

    changeView(view: string) {
      this.activeView = view;
      if (history.replaceState) history.replaceState(null, "", `#${view}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      refreshReveal();
    },

    openProject(id: number) {
      this.selectedProject = this.projects.find((p) => p.id === id) ?? null;
    },

    /** Résout une image (URL externe ou chemin local + base path). */
    asset(path: string | undefined) {
      return assetUrl(path, boot.base);
    },

    openImage(src: string) {
      this.lightbox = src;
    },

    openCv() {
      this.cvOpen = true;
    },

    toggleTheme() {
      this.isLight = !this.isLight;
      document.documentElement.classList.toggle("light", this.isLight);
      try {
        localStorage.setItem("theme", this.isLight ? "light" : "dark");
      } catch {
        /* ignore */
      }
    },

    // --- Personnaliseur ---
    setFont(id: string) {
      const f = this.fontPairings.find((x) => x.id === id);
      if (!f) return;
      this.fontId = id;
      const root = document.documentElement;
      root.style.setProperty("--font-sans", f.sans);
      root.style.setProperty("--font-mono", f.mono);
      try {
        localStorage.setItem(STORAGE.fontId, id);
        localStorage.setItem(STORAGE.fontSans, f.sans);
        localStorage.setItem(STORAGE.fontMono, f.mono);
      } catch {
        /* ignore */
      }
    },

    setPalette(id: string) {
      const t = this.colorThemes.find((x) => x.id === id);
      if (!t) return;
      this.paletteId = id;
      const root = document.documentElement;
      root.style.setProperty("--neon-cyan", t.cyan);
      root.style.setProperty("--neon-purple", t.purple);
      root.style.setProperty("--neon-green", t.green);
      try {
        localStorage.setItem(STORAGE.themeId, id);
        localStorage.setItem(STORAGE.neon, JSON.stringify([t.cyan, t.purple, t.green]));
      } catch {
        /* ignore */
      }
      // Prévient les effets canvas (particules) de recharger la palette.
      window.dispatchEvent(new Event("palette-change"));
    },

    resetCustomize() {
      this.setFont(DEFAULT_FONT);
      this.setPalette(DEFAULT_THEME);
    },

    async generateCv(templateId: string) {
      if (this.cvBusy) return;
      this.cvBusy = templateId;
      try {
        await generateCv(boot.content, templateId, boot.base);
      } catch (err) {
        console.error("Génération CV échouée", err);
        alert("La génération du CV a échoué. Réessaie.");
      } finally {
        this.cvBusy = null;
        this.cvOpen = false;
      }
    },

    async submitForm() {
      this.formError = "";
      // Anti-spam : honeypot rempli => on ignore silencieusement (bot).
      if (this.form.botcheck) return;

      const web3key = boot.content?.contact?.web3formsKey?.trim();
      const endpoint = boot.formEndpoint?.trim();
      this.formSending = true;

      try {
        if (web3key) {
          // --- Web3Forms (gratuit, sans serveur) ---
          const res = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              access_key: web3key,
              subject: `Portfolio — nouveau message de ${this.form.name}`,
              from_name: "Portfolio Bryan Clark",
              name: this.form.name,
              email: this.form.email,
              message: this.form.message,
            }),
          });
          const out = await res.json();
          if (!out.success) throw new Error(out.message || "Échec");
          this.markSent();
        } else if (endpoint) {
          // --- Formspree (ou autre endpoint compatible) ---
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify(this.form),
          });
          if (!res.ok) throw new Error("Échec de l'envoi");
          this.markSent();
        } else {
          // --- Repli : ouvre le client mail (aucune config) ---
          const subject = encodeURIComponent(`Contact portfolio — ${this.form.name}`);
          const body = encodeURIComponent(
            `${this.form.message}\n\n— ${this.form.name} (${this.form.email})`,
          );
          window.location.href = `mailto:${boot.email}?subject=${subject}&body=${body}`;
          this.markSent();
        }
      } catch (err) {
        this.formError = "Oups, l'envoi a échoué. Réessaie ou écris-moi directement par email.";
      } finally {
        this.formSending = false;
      }
    },

    markSent() {
      this.formSent = true;
      setTimeout(() => {
        this.form = { name: "", email: "", message: "", botcheck: "" };
        this.formSent = false;
      }, 4000);
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("portfolioApp", portfolioApp);
});

window.Alpine = Alpine;
Alpine.start();
