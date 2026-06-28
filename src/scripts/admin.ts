import Alpine from "alpinejs";
import type { Content, Project, Lab } from "../lib/content";
import { GRADIENT_PRESETS } from "../lib/content";
import { assetUrl } from "../lib/url";
import { buildLabSrcdoc } from "../lib/labs";
import { marked } from "marked";

interface BlogPostDraft {
  originalSlug: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  draft: boolean;
  cover: string;
  body: string;
}
interface BlogPost {
  slug: string;
  data: { title: string; description: string; date: string; tags: string[]; draft?: boolean; cover?: string };
  body: string;
}

function slugifyTitle(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

declare global {
  interface Window {
    __ADMIN_SEED__: Content;
  }
}

const API = "/api/admin/content";
const BACKUP_KEY = "portfolio-admin-backup";
const GATE_KEY = "portfolio-admin-unlocked";
// SHA-256 de la phrase d'accès (par défaut "abc-dev-2026"). Pour la changer :
// node -e "console.log(require('crypto').createHash('sha256').update('TA_PHRASE').digest('hex'))"
// NB : garde-fou « soft » côté client (les données sont de toute façon publiques
// dans le build) — ça décourage l'accès, ce n'est pas une sécurité forte.
const GATE_HASH = "69bc61cc81190cf96062259bf8dc878c146bd2d22a09076db2c84ed80a784728";

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function emptyProject(id: number): Project {
  return {
    id,
    name: "Nouveau projet",
    year: String(new Date().getFullYear()),
    featured: false,
    shortDesc: "",
    fullDesc: "",
    tags: [],
    gradient: GRADIENT_PRESETS[0],
    repoUrl: "",
    demoUrl: "",
    cover: "",
    gallery: [],
    features: [],
  };
}

function adminApp() {
  return {
    loading: true,
    apiAvailable: false,
    saving: false,
    status: "",
    statusType: "info" as "info" | "success" | "error",
    activeTab: "site",
    // Garde-fou d'accès (soft) à la console
    unlocked: false,
    gateInput: "",
    gateError: false,
    async tryUnlock() {
      const hash = await sha256Hex(this.gateInput);
      if (hash === GATE_HASH) {
        this.unlocked = true;
        this.gateError = false;
        this.gateInput = "";
        try {
          sessionStorage.setItem(GATE_KEY, "1");
        } catch {
          /* ignore */
        }
      } else {
        this.gateError = true;
      }
    },
    // Filtres de recherche (listes nombreuses)
    projectQuery: "",
    labQuery: "",
    // --- Articles de blog ---
    posts: [] as BlogPost[],
    editingPost: false,
    postBusy: false,
    postDraft: {
      originalSlug: "",
      slug: "",
      title: "",
      description: "",
      date: "",
      tags: [],
      draft: false,
      cover: "",
      body: "",
    } as BlogPostDraft,
    /** Un texte contient-il la recherche (insensible casse/accents) ? */
    matches(haystack: string, query: string): boolean {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (haystack || "").toLowerCase().includes(q);
    },
    data: null as unknown as Content,
    gradients: GRADIENT_PRESETS as readonly string[],

    tabs: [
      { id: "site", label: "Identité" },
      { id: "hero", label: "Hero" },
      { id: "stats", label: "Stats" },
      { id: "about", label: "À propos" },
      { id: "skills", label: "Compétences" },
      { id: "projects", label: "Projets" },
      { id: "labs", label: "Labs" },
      { id: "blog", label: "Articles" },
      { id: "experience", label: "Parcours" },
      { id: "contact", label: "Contact" },
    ],

    async init() {
      // Déverrouillage mémorisé pour la session.
      try {
        if (sessionStorage.getItem(GATE_KEY) === "1") this.unlocked = true;
      } catch {
        /* ignore */
      }
      // Seed = données actuelles intégrées au build (fonctionne même sans API).
      this.data = structuredClone(window.__ADMIN_SEED__);
      try {
        const res = await fetch(API, { method: "GET" });
        if (res.ok) {
          this.data = await res.json();
          this.apiAvailable = true;
        }
      } catch {
        this.apiAvailable = false;
      }
      // Restaure un éventuel brouillon local plus récent.
      const backup = localStorage.getItem(BACKUP_KEY);
      if (backup && !this.apiAvailable) {
        try {
          this.data = JSON.parse(backup);
          this.flash("Brouillon local restauré.", "info");
        } catch {
          /* ignore */
        }
      }
      this.normalizeProjects();
      if (!Array.isArray(this.data.labs)) this.data.labs = [];
      for (const l of this.data.labs) {
        if (!l.demo) l.demo = { html: "", css: "", js: "" };
      }
      if (!this.data.analytics) this.data.analytics = { cloudflareToken: "" };
      await this.refreshPosts();
      this.loading = false;
    },

    /** Garantit que chaque projet a bien cover/gallery (anciennes données). */
    normalizeProjects() {
      for (const p of this.data.projects) {
        if (typeof p.cover !== "string") p.cover = "";
        if (!Array.isArray(p.gallery)) p.gallery = [];
      }
    },

    asset(path: string | undefined) {
      return assetUrl(path, import.meta.env.BASE_URL);
    },

    flash(msg: string, type: "info" | "success" | "error" = "info") {
      this.status = msg;
      this.statusType = type;
      if (type !== "error") {
        setTimeout(() => (this.status = ""), 4000);
      }
    },

    persistBackup() {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(this.data));
    },

    async save() {
      this.saving = true;
      this.persistBackup();
      if (!this.apiAvailable) {
        this.saving = false;
        this.flash(
          "Mode hors-ligne : pas de serveur local. Brouillon sauvé dans le navigateur — utilise « Exporter » puis remplace src/data/content.json.",
          "error",
        );
        return;
      }
      try {
        const res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.data),
        });
        const out = await res.json();
        if (!res.ok || !out.ok) throw new Error(out.error || "Échec");
        this.flash("✓ Sauvegardé dans src/data/content.json — pense à git push pour publier.", "success");
      } catch (err) {
        this.flash("Erreur de sauvegarde : " + (err as Error).message, "error");
      } finally {
        this.saving = false;
      }
    },

    exportJson() {
      const blob = new Blob([JSON.stringify(this.data, null, 2) + "\n"], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "content.json";
      a.click();
      URL.revokeObjectURL(url);
    },

    async importJson(event: Event) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      try {
        this.data = JSON.parse(await file.text());
        this.flash("Fichier importé. Vérifie puis sauvegarde.", "success");
      } catch {
        this.flash("Fichier JSON invalide.", "error");
      }
      input.value = "";
    },

    // ---- Helpers tableaux ----
    move<T>(arr: T[], i: number, delta: number) {
      const j = i + delta;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    },
    remove<T>(arr: T[], i: number) {
      arr.splice(i, 1);
    },
    addString(arr: string[]) {
      arr.push("");
    },

    nextId(arr: { id: number }[]) {
      return arr.reduce((m, x) => Math.max(m, x.id), 0) + 1;
    },

    // ---- Projets ----
    addProject() {
      this.data.projects.unshift(emptyProject(this.nextId(this.data.projects)));
      this.flash("Projet ajouté en tête de liste.", "info");
    },

    fileToDataUrl(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },

    /** Upload un fichier vers public/<dir>/ (dev only) → renvoie le chemin. */
    async uploadFile(file: File, dir: "projects" | "cv" | "profile" | "blog" = "projects"): Promise<string | null> {
      if (!this.apiAvailable) {
        this.flash(
          "L'upload de fichier nécessite le serveur local (npm run dev). Tu peux sinon coller une URL.",
          "error",
        );
        return null;
      }
      try {
        const dataUrl = await this.fileToDataUrl(file);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, dataUrl, dir }),
        });
        const out = await res.json();
        if (!res.ok || !out.ok) throw new Error(out.error || "Échec de l'upload");
        this.flash(`✓ Fichier ajouté dans public/${dir}/.`, "success");
        return out.path as string;
      } catch (err) {
        this.flash("Upload : " + (err as Error).message, "error");
        return null;
      }
    },

    async uploadCover(event: Event, project: Project) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      input.value = "";
      if (!file) return;
      const path = await this.uploadFile(file, "projects");
      if (path) project.cover = path;
    },

    async uploadGallery(event: Event, project: Project) {
      const input = event.target as HTMLInputElement;
      const files = Array.from(input.files ?? []);
      input.value = "";
      if (!project.gallery) project.gallery = [];
      for (const file of files) {
        const path = await this.uploadFile(file, "projects");
        if (path) project.gallery.push(path);
      }
    },

    async uploadCv(event: Event) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      input.value = "";
      if (!file) return;
      const path = await this.uploadFile(file, "cv");
      if (path) this.data.site.cvUrl = path;
    },

    async uploadPhoto(event: Event) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      input.value = "";
      if (!file) return;
      const path = await this.uploadFile(file, "profile");
      if (path) this.data.site.photo = path;
    },

    // ---- Compétences ----
    addSkillCategory() {
      this.data.skills.push({ name: "Nouvelle catégorie", icon: "✨", items: [] });
    },

    // ---- Expérience ----
    addExperience() {
      this.data.experience.unshift({
        id: this.nextId(this.data.experience),
        role: "Nouveau poste",
        company: "",
        period: "",
        description: "",
        tech: [],
      });
    },

    // ---- Labs ----
    addLab() {
      const lab: Lab = {
        id: this.nextId(this.data.labs),
        title: "Nouvelle expérimentation",
        tagline: "",
        status: "idea",
        tags: [],
        url: "",
        emoji: "🔬",
        demo: { html: "", css: "", js: "" },
      };
      this.data.labs.unshift(lab);
      this.flash("Labo ajouté en tête de liste.", "info");
    },

    /** Document iframe pour l'aperçu live d'un labo dans l'admin. */
    labPreview(lab: Lab): string {
      return buildLabSrcdoc(lab.demo);
    },

    // ---- Articles de blog (fichiers .md via l'API dev) ----
    async refreshPosts() {
      if (!this.apiAvailable) return;
      try {
        const res = await fetch("/api/admin/blog");
        if (res.ok) this.posts = await res.json();
      } catch {
        /* ignore */
      }
    },
    newPost() {
      this.postDraft = {
        originalSlug: "",
        slug: "",
        title: "",
        description: "",
        date: new Date().toISOString().slice(0, 10),
        tags: [],
        draft: true,
        cover: "",
        body: "# Mon titre\n\nÉcris ton article en **Markdown**…\n",
      };
      this.editingPost = true;
    },
    editPost(post: BlogPost) {
      this.postDraft = {
        originalSlug: post.slug,
        slug: post.slug,
        title: post.data.title ?? "",
        description: post.data.description ?? "",
        date: post.data.date ?? "",
        tags: [...(post.data.tags ?? [])],
        draft: Boolean(post.data.draft),
        cover: post.data.cover ?? "",
        body: post.body ?? "",
      };
      this.editingPost = true;
    },
    cancelPost() {
      this.editingPost = false;
    },
    /** Slug effectif (saisi ou dérivé du titre). */
    get postSlug(): string {
      return slugifyTitle(this.postDraft.slug || this.postDraft.title);
    },
    /** Aperçu Markdown → HTML (rendu approximatif ; le site final ajoute Shiki/KaTeX). */
    get postPreviewHtml(): string {
      return marked.parse(this.postDraft.body || "", { async: false }) as string;
    },
    async savePost() {
      if (!this.apiAvailable) {
        this.flash("L'édition d'articles nécessite le serveur local (npm run dev).", "error");
        return;
      }
      if (!this.postDraft.title.trim()) {
        this.flash("Donne un titre à l'article.", "error");
        return;
      }
      this.postBusy = true;
      try {
        const res = await fetch("/api/admin/blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: this.postSlug,
            originalSlug: this.postDraft.originalSlug,
            data: {
              title: this.postDraft.title,
              description: this.postDraft.description,
              date: this.postDraft.date,
              tags: this.postDraft.tags,
              draft: this.postDraft.draft,
              cover: this.postDraft.cover,
            },
            body: this.postDraft.body,
          }),
        });
        const out = await res.json();
        if (!res.ok || !out.ok) throw new Error(out.error || "Échec");
        this.flash("✓ Article enregistré — pense à git push pour publier.", "success");
        this.editingPost = false;
        await this.refreshPosts();
      } catch (err) {
        this.flash("Erreur : " + (err as Error).message, "error");
      } finally {
        this.postBusy = false;
      }
    },
    async deletePost(slug: string) {
      if (!confirm("Supprimer définitivement cet article ?")) return;
      try {
        const res = await fetch("/api/admin/blog?slug=" + encodeURIComponent(slug), {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Échec");
        this.flash("Article supprimé.", "info");
        await this.refreshPosts();
      } catch (err) {
        this.flash("Erreur : " + (err as Error).message, "error");
      }
    },
    async uploadPostCover(event: Event) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      input.value = "";
      if (!file) return;
      const path = await this.uploadFile(file, "blog");
      if (path) this.postDraft.cover = path;
    },

    // ---- Stats ----
    addStat() {
      this.data.stats.push({ value: "0", label: "Nouveau", color: "neon-cyan" });
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("adminApp", adminApp);
});

window.Alpine = Alpine;
Alpine.start();
