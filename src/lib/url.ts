/**
 * Résout une référence d'image : laisse passer les URL absolues
 * (http, https, data:) et préfixe les chemins locaux avec le base path
 * du site (utile pour un déploiement GitHub Pages "projet").
 */
export function assetUrl(path: string | undefined, base = "/"): string {
  if (!path) return "";
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  const cleanBase = base.endsWith("/") ? base : base + "/";
  return cleanBase + path.replace(/^\//, "");
}
