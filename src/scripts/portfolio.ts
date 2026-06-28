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
import type { Project, Content, Lab } from "../lib/content";
import { buildLabSrcdoc } from "../lib/labs";
import { NAV_ITEMS } from "../lib/nav";

interface Command {
  id: string;
  label: string;
  icon: string;
  type: "view" | "cv" | "customize" | "theme" | "link" | "href" | "project" | "lab";
  arg?: string | number;
  keywords?: string;
}

interface PortfolioBootstrap {
  projects: Project[];
  tagline: string;
  formEndpoint: string;
  email: string;
  web3formsKey: string;
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
    web3formsKey: "",
    base: "/",
    content: null as unknown as Content,
  };

  return {
    activeView: "home",
    mobileMenuOpen: false,
    // Filtre de la liste de projets par tag ("" = tous)
    projectTag: "",
    // --- Palette de commandes (⌘K) ---
    paletteOpen: false,
    paletteQuery: "",
    paletteIndex: 0,
    selectedProject: null as Project | null,
    // --- Modal Labs (démo agrandie + onglets code) ---
    labs: (boot.content?.labs ?? []) as Lab[],
    selectedLab: null as Lab | null,
    labTab: "result" as "result" | "html" | "css" | "js",
    labViewport: "fit" as "fit" | "desktop" | "mobile",
    lightbox: null as string | null,
    lightboxImages: [] as string[],
    lightboxIndex: 0,
    // Sens du slide pour l'animation ("next" = entre par la droite, "prev" = par la gauche).
    slideDir: "next" as "next" | "prev",
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
    // --- Toasts (notifications) ---
    toasts: [] as { id: number; msg: string; type: "success" | "error" | "info" }[],
    toastSeq: 0,
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
      this.mobileMenuOpen = false;
      if (history.replaceState) history.replaceState(null, "", `#${view}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      refreshReveal();
    },

    openProject(id: number) {
      this.selectedProject = this.projects.find((p) => p.id === id) ?? null;
    },

    // --- Palette de commandes (⌘K) ---
    togglePalette() {
      this.paletteOpen = !this.paletteOpen;
      this.paletteQuery = "";
      this.paletteIndex = 0;
    },
    closePalette() {
      this.paletteOpen = false;
    },
    /** Toutes les commandes disponibles (vues, actions, projets, labos, liens). */
    get paletteCommands(): Command[] {
      const cmds: Command[] = [];
      for (const n of NAV_ITEMS) {
        cmds.push({
          id: "view-" + n.id,
          label: "Aller : " + n.label,
          icon: "→",
          type: "view",
          arg: n.id,
          keywords: n.id,
        });
      }
      cmds.push({ id: "blog", label: "Lire le blog", icon: "📝", type: "href", arg: boot.base + "blog", keywords: "blog articles notes écrits" });
      cmds.push({ id: "cv", label: "Générer mon CV", icon: "📄", type: "cv", keywords: "cv pdf resume curriculum" });
      cmds.push({ id: "customize", label: "Personnaliser l'apparence", icon: "🎨", type: "customize", keywords: "theme couleur police palette personnaliser" });
      cmds.push({
        id: "theme",
        label: this.isLight ? "Passer en mode sombre" : "Passer en mode clair",
        icon: "🌓",
        type: "theme",
        keywords: "theme dark light sombre clair mode",
      });
      const s = boot.content?.socials;
      if (s?.github) cmds.push({ id: "gh", label: "Ouvrir GitHub", icon: "↗", type: "link", arg: s.github, keywords: "github code repo" });
      if (s?.linkedin) cmds.push({ id: "li", label: "Ouvrir LinkedIn", icon: "↗", type: "link", arg: s.linkedin, keywords: "linkedin reseau" });
      if (s?.email) cmds.push({ id: "mail", label: "M'écrire un email", icon: "✉", type: "link", arg: "mailto:" + s.email, keywords: "email mail contact écrire" });
      for (const p of this.projects) {
        cmds.push({ id: "p-" + p.id, label: "Projet : " + p.name, icon: "◆", type: "project", arg: p.id, keywords: ((p.tags ?? []).join(" ") + " projet").toLowerCase() });
      }
      for (const l of this.labs) {
        cmds.push({ id: "l-" + l.id, label: "Labo : " + l.title, icon: "🧪", type: "lab", arg: l.id, keywords: ((l.tags ?? []).join(" ") + " labo").toLowerCase() });
      }
      return cmds;
    },
    /** Commandes filtrées par la recherche. */
    get paletteResults(): Command[] {
      const q = this.paletteQuery.trim().toLowerCase();
      const all = this.paletteCommands;
      if (!q) return all;
      return all.filter((c) => (c.label + " " + (c.keywords ?? "")).toLowerCase().includes(q));
    },
    movePalette(delta: number) {
      const n = this.paletteResults.length;
      if (!n) return;
      this.paletteIndex = (this.paletteIndex + delta + n) % n;
    },
    runPaletteAt(i: number) {
      const cmd = this.paletteResults[i];
      if (cmd) this.runCommand(cmd);
    },
    runCommand(cmd: Command) {
      this.closePalette();
      switch (cmd.type) {
        case "view":
          this.changeView(cmd.arg as string);
          break;
        case "cv":
          this.cvOpen = true;
          break;
        case "customize":
          this.customizeOpen = true;
          break;
        case "theme":
          this.toggleTheme();
          break;
        case "link":
          window.open(cmd.arg as string, "_blank", "noopener");
          break;
        case "href":
          window.location.href = cmd.arg as string;
          break;
        case "project":
          this.openProject(cmd.arg as number);
          break;
        case "lab":
          this.changeView("labs");
          this.openLab(cmd.arg as number);
          break;
      }
    },

    // --- Labs ---
    openLab(id: number) {
      this.selectedLab = this.labs.find((l) => l.id === id) ?? null;
      this.labTab = "result";
      this.labViewport = "fit";
    },
    closeLab() {
      this.selectedLab = null;
    },
    /** Document complet de la démo, pour le srcdoc de l'iframe agrandi. */
    get labSrcdoc(): string {
      return this.selectedLab ? buildLabSrcdoc(this.selectedLab.demo) : "";
    },

    /** Résout une image (URL externe ou chemin local + base path). */
    asset(path: string | undefined) {
      return assetUrl(path, boot.base);
    },

    /** Liste défilable de la lightbox : couverture + galerie (URLs résolues). */
    get galleryAll(): string[] {
      const p = this.selectedProject;
      if (!p) return [];
      const list: string[] = [];
      if (p.cover) list.push(p.cover);
      if (p.gallery && p.gallery.length) list.push(...p.gallery);
      return list.map((img) => this.asset(img));
    },

    /** Précharge toutes les images en mémoire pour éviter le flash au défilement. */
    preloadGallery(imgs: string[]) {
      if (typeof Image === "undefined") return;
      for (const src of imgs) {
        const im = new Image();
        im.src = src;
      }
    },

    /** Ouvre la lightbox sur l'image d'index donné de galleryAll. */
    openImageAt(index: number) {
      const imgs = this.galleryAll;
      if (!imgs.length) return;
      this.lightboxImages = imgs;
      this.preloadGallery(imgs);
      this.slideDir = "next";
      this.lightboxIndex = Math.max(0, Math.min(index, imgs.length - 1));
      this.lightbox = imgs[this.lightboxIndex];
    },

    nextImage() {
      if (!this.lightbox || !this.lightboxImages.length) return;
      this.slideDir = "next";
      this.lightboxIndex = (this.lightboxIndex + 1) % this.lightboxImages.length;
      this.lightbox = this.lightboxImages[this.lightboxIndex];
    },

    prevImage() {
      if (!this.lightbox || !this.lightboxImages.length) return;
      this.slideDir = "prev";
      const n = this.lightboxImages.length;
      this.lightboxIndex = (this.lightboxIndex - 1 + n) % n;
      this.lightbox = this.lightboxImages[this.lightboxIndex];
    },

    closeLightbox() {
      this.lightbox = null;
      this.lightboxImages = [];
      this.lightboxIndex = 0;
    },

    // --- Swipe tactile (mobile) ---
    touchStartX: 0,
    touchStartY: 0,
    onTouchStart(e: TouchEvent) {
      const t = e.changedTouches[0];
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
    },
    onTouchEnd(e: TouchEvent) {
      const t = e.changedTouches[0];
      const dx = t.clientX - this.touchStartX;
      const dy = t.clientY - this.touchStartY;
      // Geste horizontal franc (et pas un scroll vertical) : on navigue.
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) this.nextImage();
        else this.prevImage();
      }
    },

    openCv() {
      this.cvOpen = true;
    },

    // --- Toasts ---
    toast(msg: string, type: "success" | "error" | "info" = "success", duration = 3200) {
      const id = ++this.toastSeq;
      this.toasts.push({ id, msg, type });
      setTimeout(() => this.removeToast(id), duration);
    },
    removeToast(id: number) {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    },

    toggleTheme() {
      this.isLight = !this.isLight;
      document.documentElement.classList.toggle("light", this.isLight);
      try {
        localStorage.setItem("theme", this.isLight ? "light" : "dark");
      } catch {
        /* ignore */
      }
      this.toast(this.isLight ? "Mode clair activé ☀" : "Mode sombre activé ☾", "info", 2200);
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
      this.toast(`Police « ${f.label} » appliquée`, "info", 2000);
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
      this.toast(`Palette « ${t.label} » appliquée`, "info", 2000);
    },

    resetCustomize() {
      this.setFont(DEFAULT_FONT);
      this.setPalette(DEFAULT_THEME);
      this.toast("Apparence réinitialisée", "info", 2000);
    },

    async generateCv(templateId: string) {
      if (this.cvBusy) return;
      this.cvBusy = templateId;
      try {
        await generateCv(boot.content, templateId, boot.base);
        this.toast("CV généré et téléchargé ✓", "success");
      } catch (err) {
        console.error("Génération CV échouée", err);
        this.toast("La génération du CV a échoué. Réessaie.", "error");
      } finally {
        this.cvBusy = null;
        this.cvOpen = false;
      }
    },

    async submitForm() {
      this.formError = "";
      // Anti-spam : honeypot rempli => on ignore silencieusement (bot).
      if (this.form.botcheck) return;

      const web3key = (boot.web3formsKey || boot.content?.contact?.web3formsKey || "").trim();
      const endpoint = boot.formEndpoint?.trim();
      this.formSending = true;

      try {
        if (web3key) {
          // --- Web3Forms (gratuit, sans serveur) ---
          // FormData (pas de Content-Type JSON) => évite la requête preflight
          // CORS, plus robuste. NE PAS renommer "email" (validation + reply-to).
          const fd = new FormData();
          fd.append("access_key", web3key);
          fd.append("subject", `Nouveau message de ${this.form.name} — Portfolio`);
          fd.append("from_name", "Portfolio Bryan Clark");
          fd.append("name", this.form.name);
          fd.append("email", this.form.email);
          fd.append("message", this.form.message);
          fd.append("replyto", this.form.email);
          const res = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: { Accept: "application/json" },
            body: fd,
          });
          const out = await res.json().catch(() => ({ success: false, message: "Réponse illisible" }));
          // Surface le vrai message de Web3Forms (ex. email à vérifier).
          if (!out.success) throw new Error(out.message || `Erreur ${res.status}`);
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
        // Affiche la vraie raison (utile pour diagnostiquer : email non vérifié,
        // domaine non autorisé, réseau…).
        const reason = (err as Error)?.message || "";
        this.formError = reason
          ? `Échec de l'envoi : ${reason}`
          : "Oups, l'envoi a échoué. Réessaie ou écris-moi directement par email.";
        this.toast("Échec de l'envoi. Réessaie 🙏", "error");
      } finally {
        this.formSending = false;
      }
    },

    markSent() {
      // Vide les champs et bascule le formulaire en état "succès".
      this.form = { name: "", email: "", message: "", botcheck: "" };
      this.formError = "";
      this.formSent = true;
      this.toast("Message envoyé ! Je te réponds vite 🚀", "success", 4000);
    },

    resetContactForm() {
      this.formSent = false;
      this.formError = "";
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("portfolioApp", portfolioApp);
});

window.Alpine = Alpine;
Alpine.start();
