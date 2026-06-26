import Alpine from "alpinejs";
import { refreshReveal } from "./effects";
import { assetUrl } from "../lib/url";
import type { Project } from "../lib/content";

interface PortfolioBootstrap {
  projects: Project[];
  tagline: string;
  formEndpoint: string;
  email: string;
  base: string;
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
  };

  return {
    activeView: "home",
    selectedProject: null as Project | null,
    lightbox: null as string | null,
    formSent: false,
    formError: "",
    form: { name: "", email: "", message: "" },
    typedText: "",
    fullText: boot.tagline,
    projects: boot.projects,

    init() {
      // Permet d'ouvrir une vue directement via le hash (#projects, ...).
      const hash = window.location.hash.replace("#", "");
      if (hash && document.querySelector(`[x-show="activeView === '${hash}'"]`)) {
        this.activeView = hash;
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

    async submitForm() {
      this.formError = "";
      const endpoint = boot.formEndpoint;

      // Pas d'endpoint configuré → on ouvre le client mail (fonctionne en statique).
      if (!endpoint) {
        const subject = encodeURIComponent(`Contact portfolio — ${this.form.name}`);
        const body = encodeURIComponent(
          `${this.form.message}\n\n— ${this.form.name} (${this.form.email})`,
        );
        window.location.href = `mailto:${boot.email}?subject=${subject}&body=${body}`;
        this.markSent();
        return;
      }

      // Endpoint configuré (ex: Formspree) → envoi AJAX.
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(this.form),
        });
        if (!res.ok) throw new Error("Échec de l'envoi");
        this.markSent();
      } catch (err) {
        this.formError = "Oups, l'envoi a échoué. Réessaie ou écris-moi directement.";
      }
    },

    markSent() {
      this.formSent = true;
      setTimeout(() => {
        this.form = { name: "", email: "", message: "" };
        this.formSent = false;
      }, 3000);
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("portfolioApp", portfolioApp);
});

window.Alpine = Alpine;
Alpine.start();
