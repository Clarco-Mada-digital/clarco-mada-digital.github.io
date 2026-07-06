import Alpine from "alpinejs";
import type { Content, Project, Lab } from "../lib/content";
import { GRADIENT_PRESETS } from "../lib/content";
import { assetUrl } from "../lib/url";
import { buildLabSrcdoc } from "../lib/labs";
import { registerHighlight } from "./highlight";
import { marked } from "marked";
import markedKatex from "marked-katex-extension";

// Active le rendu des maths ($…$ et $$…$$) dans l'aperçu Markdown.
// nonStandard : tokenise les maths AVANT le markdown (préserve les _ du LaTeX).
marked.use(markedKatex({ throwOnError: false, nonStandard: true }));

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
// Config IA mémorisée dans le navigateur (la clé API ne quitte jamais ta machine,
// elle est seulement relayée par le serveur dev local au fournisseur choisi).
// La clé API est CHIFFRÉE (AES-GCM) avec ta phrase d'accès admin avant d'être
// posée dans localStorage. La phrase, elle, ne vit qu'en sessionStorage
// (éphémère). Donc le stockage persistant ne contient jamais la clé en clair.
const AI_KEY = "portfolio-admin-ai";
const SECRET_KEY = "portfolio-admin-secret";

/** Dérive une clé AES-256 à partir de la phrase d'accès (PBKDF2). */
async function deriveAesKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("portfolio-admin-ai-v1"), iterations: 120000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Chiffre une chaîne → base64 (iv + ciphertext). Renvoie "" si vide. */
async function encryptStr(plain: string, passphrase: string): Promise<string> {
  if (!plain || !passphrase) return "";
  const key = await deriveAesKey(passphrase);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)),
  );
  const buf = new Uint8Array(iv.length + ct.length);
  buf.set(iv, 0);
  buf.set(ct, iv.length);
  return btoa(String.fromCharCode(...buf));
}

/** Déchiffre une chaîne base64. Renvoie "" si échec (mauvaise phrase, etc.). */
async function decryptStr(b64: string, passphrase: string): Promise<string> {
  if (!b64 || !passphrase) return "";
  try {
    const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const ct = raw.slice(12);
    const key = await deriveAesKey(passphrase);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch {
    return "";
  }
}

interface AiProviderInfo {
  id: string;
  label: string;
  defaultModel: string;
  modelHint: string;
  webSearch: boolean;
  keyUrl: string;
}
const AI_PROVIDERS: AiProviderInfo[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultModel: "anthropic/claude-3.5-sonnet",
    modelHint: "ex. anthropic/claude-3.5-sonnet, google/gemini-2.0-flash-001, x-ai/grok-2",
    webSearch: true,
    keyUrl: "https://openrouter.ai/keys",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    defaultModel: "gemini-2.0-flash",
    modelHint: "ex. gemini-2.0-flash, gemini-2.5-pro",
    webSearch: true,
    keyUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    defaultModel: "grok-2-latest",
    modelHint: "ex. grok-2-latest, grok-beta",
    webSearch: false,
    keyUrl: "https://console.x.ai",
  },
  {
    id: "groq",
    label: "Groq",
    defaultModel: "llama-3.3-70b-versatile",
    modelHint: "ex. llama-3.3-70b-versatile, qwen-2.5-32b",
    webSearch: false,
    keyUrl: "https://console.groq.com/keys",
  },
];
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
    // Phrase d'accès gardée en mémoire (+ sessionStorage éphémère) pour
    // (dé)chiffrer la clé API. Jamais écrite dans localStorage.
    gateSecret: "",
    async tryUnlock() {
      const hash = await sha256Hex(this.gateInput);
      if (hash === GATE_HASH) {
        this.unlocked = true;
        this.gateError = false;
        this.gateSecret = this.gateInput;
        this.gateInput = "";
        try {
          sessionStorage.setItem(GATE_KEY, "1");
          sessionStorage.setItem(SECRET_KEY, this.gateSecret);
        } catch {
          /* ignore */
        }
        // Maintenant qu'on a la phrase, on peut déchiffrer la clé API mémorisée.
        await this.loadAiConfig();
      } else {
        this.gateError = true;
      }
    },
    // Filtres de recherche (listes nombreuses)
    projectQuery: "",
    labQuery: "",
    // --- Génération d'articles par IA ---
    aiProviders: AI_PROVIDERS as readonly AiProviderInfo[],
    ai: {
      open: false,
      provider: "openrouter",
      // Une clé par fournisseur : changer de fournisseur n'écrase pas l'autre clé.
      apiKeys: {} as Record<string, string>,
      model: "anthropic/claude-3.5-sonnet",
      topic: "",
      webSearch: true,
      cover: true,
      busy: false,
      error: "",
    },
    /** Clé API du fournisseur actuellement sélectionné (lecture). */
    get aiKey(): string {
      return this.ai.apiKeys[this.ai.provider] || "";
    },
    // Vrai s'il existe une clé chiffrée en mémoire qu'on n'a pas pu déverrouiller.
    aiKeyLocked: false,
    // Modèles disponibles pour la clé courante (chargés à la demande, pas en dur).
    aiModels: [] as string[],
    aiManualModel: false,
    aiModelFilter: "",
    aiModelOpen: false,
    // Évite de relancer l'auto-test en boucle si le panneau est rouvert (ou si le test échoue).
    aiAutoTried: false,
    aiTest: { busy: false, ok: false, msg: "" },
    /** Ouvre/ferme le panneau IA ; à la 1ʳᵉ ouverture, charge la liste si une clé est prête. */
    toggleAi() {
      this.ai.open = !this.ai.open;
      // UNE SEULE tentative auto par session : on ne re-teste pas à chaque réouverture,
      // même si le test précédent a échoué (sinon on spamme l'API → rate-limit).
      if (this.ai.open && !this.aiAutoTried && this.aiKey.trim() && !this.aiModels.length && this.apiAvailable) {
        this.aiAutoTried = true;
        void this.testAiKey();
      }
    },
    /** Choisit un modèle dans le combobox puis referme la liste. */
    pickAiModel(m: string) {
      this.ai.model = m;
      this.aiModelFilter = "";
      this.aiModelOpen = false;
      this.persistAi();
    },
    /** Modèles filtrés par la recherche (utile : OpenRouter en a des centaines). */
    get filteredAiModels(): string[] {
      const q = this.aiModelFilter.trim().toLowerCase();
      if (!q) return this.aiModels;
      return this.aiModels.filter((m) => m.toLowerCase().includes(q));
    },
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
        this.gateSecret = sessionStorage.getItem(SECRET_KEY) || "";
      } catch {
        /* ignore */
      }
      // Seed = données actuelles intégrées au build (fonctionne même sans API).
      // À faire AVANT tout `await` : le template référence `data.*`, qui ne doit
      // jamais être null pendant un rendu.
      this.data = structuredClone(window.__ADMIN_SEED__);
      // Config IA mémorisée (provider/modèle en clair, clé API chiffrée).
      await this.loadAiConfig();
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
        if (out.optimized && out.originalBytes && out.finalBytes) {
          const before = Math.round(out.originalBytes / 1024);
          const after = Math.round(out.finalBytes / 1024);
          const gain = Math.round((1 - out.finalBytes / out.originalBytes) * 100);
          this.flash(
            `✓ Image optimisée automatiquement : ${before} Ko → ${after} Ko (-${gain} %, WebP).`,
            "success",
          );
        } else {
          this.flash(`✓ Fichier ajouté dans public/${dir}/.`, "success");
        }
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
        if (res.ok) {
          const posts: BlogPost[] = await res.json();
          // Plus récent en premier (les dates sont au format YYYY-MM-DD → tri lexical = chronologique).
          posts.sort((a, b) => String(b.data.date || "").localeCompare(String(a.data.date || "")));
          this.posts = posts;
        }
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

    // ---- Génération d'articles par IA ----
    /** Infos du fournisseur actuellement sélectionné. */
    get aiProvider(): AiProviderInfo {
      return AI_PROVIDERS.find((p) => p.id === this.ai.provider) ?? AI_PROVIDERS[0];
    },
    /** Quand on change de fournisseur, propose son modèle par défaut. */
    onAiProviderChange() {
      const p = this.aiProvider;
      this.ai.model = p.defaultModel;
      if (!p.webSearch) this.ai.webSearch = false;
      // Les modèles et le résultat du test sont propres à chaque fournisseur/clé.
      this.aiModels = [];
      this.aiModelFilter = "";
      this.aiManualModel = false;
      this.aiAutoTried = false;
      this.aiTest = { busy: false, ok: false, msg: "" };
      this.persistAi();
    },
    /** Saisie/collage d'une clé : on mémorise (chiffré) puis on charge ses modèles. */
    onAiKeyChange() {
      this.persistAi();
      this.aiAutoTried = true;
      if (this.aiKey.trim() && this.apiAvailable) void this.testAiKey();
    },
    /**
     * Teste la clé API et charge les modèles auxquels elle donne accès.
     * Interroger l'endpoint /models du fournisseur valide la clé (200 = OK)
     * tout en renvoyant la liste réelle — d'où la liste dynamique, pas en dur.
     */
    async testAiKey() {
      if (!this.apiAvailable) {
        this.flash("Le test nécessite le serveur local (npm run dev).", "error");
        return;
      }
      if (!this.aiKey.trim()) {
        this.aiTest = { busy: false, ok: false, msg: "Renseigne ta clé API." };
        return;
      }
      this.persistAi();
      this.aiTest = { busy: true, ok: false, msg: "" };
      try {
        const res = await fetch("/api/admin/ai/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: this.ai.provider, apiKey: this.aiKey }),
        });
        const out = await res.json();
        if (!res.ok || !out.ok) throw new Error(out.error || `Erreur ${res.status}`);
        this.aiModels = Array.isArray(out.models) ? out.models : [];
        // Si le modèle mémorisé n'est plus proposé par la clé, bascule sur le 1ᵉʳ dispo.
        if (this.aiModels.length && !this.aiModels.includes(this.ai.model)) {
          this.ai.model = this.aiModels[0];
          this.persistAi();
        }
        this.aiManualModel = false;
        this.aiTest = {
          busy: false,
          ok: true,
          msg: `✓ Clé valide — ${this.aiModels.length} modèle(s) disponible(s).`,
        };
      } catch (err) {
        this.aiModels = [];
        this.aiTest = { busy: false, ok: false, msg: "✗ " + (err as Error).message };
      }
    },
    /** Charge la config IA ; déchiffre la clé API si on a la phrase d'accès. */
    async loadAiConfig() {
      let saved: Record<string, unknown> | null = null;
      try {
        const s = localStorage.getItem(AI_KEY);
        if (s) saved = JSON.parse(s);
      } catch {
        /* ignore */
      }
      if (!saved) return;
      if (typeof saved.provider === "string") this.ai.provider = saved.provider;
      if (typeof saved.model === "string") this.ai.model = saved.model;
      if (typeof saved.webSearch === "boolean") this.ai.webSearch = saved.webSearch;
      if (typeof saved.cover === "boolean") this.ai.cover = saved.cover;
      // Clés chiffrées par fournisseur. Compat ascendante : ancienne clé unique
      // `apiKeyEnc` → rattachée au fournisseur enregistré.
      const encMap: Record<string, string> = {};
      if (saved.apiKeysEnc && typeof saved.apiKeysEnc === "object") {
        for (const [prov, v] of Object.entries(saved.apiKeysEnc as Record<string, unknown>)) {
          if (typeof v === "string") encMap[prov] = v;
        }
      }
      if (typeof saved.apiKeyEnc === "string" && saved.apiKeyEnc && !encMap[this.ai.provider]) {
        encMap[this.ai.provider] = saved.apiKeyEnc;
      }
      let anyLocked = false;
      for (const [prov, enc] of Object.entries(encMap)) {
        const dec = this.gateSecret ? await decryptStr(enc, this.gateSecret) : "";
        if (dec) this.ai.apiKeys[prov] = dec;
        else anyLocked = true; // chiffrée mais pas déchiffrable (phrase absente).
      }
      this.aiKeyLocked = anyLocked;
    },
    async persistAi() {
      try {
        // Chaque clé est chiffrée avec la phrase d'accès ; sans phrase, on ne
        // persiste pas les clés (elles restent en mémoire le temps de la session).
        const apiKeysEnc: Record<string, string> = {};
        if (this.gateSecret) {
          for (const [prov, key] of Object.entries(this.ai.apiKeys)) {
            if (key) apiKeysEnc[prov] = await encryptStr(key, this.gateSecret);
          }
          if (this.aiKey) this.aiKeyLocked = false;
        }
        localStorage.setItem(
          AI_KEY,
          JSON.stringify({
            provider: this.ai.provider,
            apiKeysEnc,
            model: this.ai.model,
            webSearch: this.ai.webSearch,
            cover: this.ai.cover,
          }),
        );
      } catch {
        /* ignore */
      }
    },
    /** Génère un article via l'IA puis ouvre l'éditeur pré-rempli pour relecture. */
    async generateArticle(mode: "topic" | "trends") {
      if (!this.apiAvailable) {
        this.flash("La génération IA nécessite le serveur local (npm run dev).", "error");
        return;
      }
      if (!this.aiKey.trim()) {
        this.ai.error = "Renseigne ta clé API.";
        return;
      }
      if (mode === "topic" && !this.ai.topic.trim()) {
        this.ai.error = "Donne un sujet à traiter.";
        return;
      }
      this.persistAi();
      this.ai.busy = true;
      this.ai.error = "";
      try {
        const res = await fetch("/api/admin/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: this.ai.provider,
            apiKey: this.aiKey,
            model: this.ai.model,
            mode,
            topic: this.ai.topic,
            webSearch: this.ai.webSearch && this.aiProvider.webSearch,
            cover: this.ai.cover,
          }),
        });
        const out = await res.json();
        if (!res.ok || !out.ok) throw new Error(out.error || `Erreur ${res.status}`);
        const a = out.article;
        this.postDraft = {
          originalSlug: "",
          slug: "",
          title: a.title || "",
          description: a.description || "",
          date: new Date().toISOString().slice(0, 10),
          tags: Array.isArray(a.tags) ? a.tags : [],
          draft: true,
          cover: out.cover || "",
          body: a.body || "",
        };
        this.editingPost = true;
        this.ai.open = false;
        this.flash(
          a.title
            ? "✓ Article généré — relis, ajuste, puis enregistre."
            : "✓ Brouillon généré. L'IA n'a pas mis de titre clair : complète le champ Titre depuis le texte.",
          "success",
        );
      } catch (err) {
        this.ai.error = "Échec : " + (err as Error).message;
      } finally {
        this.ai.busy = false;
      }
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
registerHighlight(Alpine);
Alpine.start();
