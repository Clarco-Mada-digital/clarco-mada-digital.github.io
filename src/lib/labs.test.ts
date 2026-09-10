import { describe, it, expect } from "vitest";
import { buildLabSrcdoc, hasDemo } from "./labs";
import type { Lab } from "./content";

const demo = (d: Partial<NonNullable<Lab["demo"]>>) => ({ html: "", css: "", js: "", ...d });

describe("buildLabSrcdoc", () => {
  it("renvoie une chaîne vide sans démo", () => {
    expect(buildLabSrcdoc(undefined)).toBe("");
  });

  it("produit un document complet et injecte les trois parties", () => {
    const out = buildLabSrcdoc(demo({ html: "<p>salut</p>", css: ".a{color:red}", js: "var x=1;" }));
    expect(out).toContain("<!doctype html>");
    expect(out).toContain("<p>salut</p>");
    expect(out).toContain(".a{color:red}");
    expect(out).toContain("var x=1;");
    expect(out.trimEnd().endsWith("</html>")).toBe(true);
  });

  /**
   * Le point critique : le JS d'un labo est concaténé dans un <script>. Un
   * `</script>` dans une chaîne fermerait la balise et laisserait le reste du
   * code s'exécuter comme du HTML — c'est la porte d'entrée classique.
   */
  it("neutralise une fermeture de balise script dans le JS", () => {
    const out = buildLabSrcdoc(demo({ js: 'const s = "</script><img onerror=alert(1)>";' }));
    expect(out).not.toContain("</script><img");
    expect(out).toContain("<\\/script>");
  });

  it("échappe quelle que soit la casse", () => {
    // On isole la portion issue du labo : le document se termine par sa propre
    // balise </script> légitime, qu'il ne faut évidemment pas compter.
    const out = buildLabSrcdoc(demo({ js: 'a("</SCRIPT >")' }));
    expect(out).not.toContain('a("</SCRIPT >")');
    expect(out).toContain('a("<\\/script >")');
  });

  it("entoure le JS d'un try/catch pour qu'une erreur reste visible", () => {
    const out = buildLabSrcdoc(demo({ js: "boom()" }));
    expect(out).toContain("try {");
    expect(out).toContain("catch");
  });
});

describe("hasDemo", () => {
  const lab = (d: unknown) => ({ id: 1, title: "t", tags: [], demo: d }) as unknown as Lab;

  it("est faux sans démo ou avec une démo vide", () => {
    expect(hasDemo(lab(undefined))).toBe(false);
    expect(hasDemo(lab({ html: "", css: "", js: "" }))).toBe(false);
  });

  it("est vrai dès qu'une des trois parties est remplie", () => {
    expect(hasDemo(lab({ html: "<p>x</p>", css: "", js: "" }))).toBe(true);
    expect(hasDemo(lab({ html: "", css: "a{}", js: "" }))).toBe(true);
    expect(hasDemo(lab({ html: "", css: "", js: "x()" }))).toBe(true);
  });
});
