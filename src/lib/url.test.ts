import { describe, it, expect } from "vitest";
import { assetUrl } from "./url";

/**
 * `assetUrl` décide de chaque URL d'image du site. Une régression ici casse
 * silencieusement toutes les couvertures d'un déploiement en sous-chemin
 * (GitHub Pages « projet ») — le genre de bug qu'on ne voit qu'en ligne.
 */
describe("assetUrl", () => {
  it("renvoie une chaîne vide pour une valeur absente", () => {
    expect(assetUrl(undefined)).toBe("");
    expect(assetUrl("")).toBe("");
  });

  it("laisse passer les URL absolues sans y toucher", () => {
    expect(assetUrl("https://ex.tld/a.png")).toBe("https://ex.tld/a.png");
    expect(assetUrl("http://ex.tld/a.png")).toBe("http://ex.tld/a.png");
    // URL protocol-relative
    expect(assetUrl("//cdn.tld/a.png")).toBe("//cdn.tld/a.png");
    expect(assetUrl("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
  });

  it("préfixe un chemin local avec la base par défaut", () => {
    expect(assetUrl("/projects/a.webp")).toBe("/projects/a.webp");
    expect(assetUrl("projects/a.webp")).toBe("/projects/a.webp");
  });

  it("gère un déploiement en sous-chemin", () => {
    expect(assetUrl("/projects/a.webp", "/folio/")).toBe("/folio/projects/a.webp");
    // base sans slash final : ne doit pas coller les segments
    expect(assetUrl("/projects/a.webp", "/folio")).toBe("/folio/projects/a.webp");
  });

  it("ne double jamais le slash de séparation", () => {
    expect(assetUrl("//", "/folio/")).not.toContain("///");
    expect(assetUrl("/a.png", "/folio/")).toBe("/folio/a.png");
  });
});
