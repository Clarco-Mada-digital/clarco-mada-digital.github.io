import type { APIRoute } from "astro";
import { content } from "../lib/content";

/**
 * Contenu complet du portfolio, servi comme fichier statique.
 *
 * Il était auparavant sérialisé dans le HTML de la page d'accueil
 * (`window.__PORTFOLIO__.content`, ~116 Ko) alors que deux fonctionnalités
 * seules en ont besoin, et seulement sur action du visiteur :
 *   - la génération du CV PDF ;
 *   - l'ouverture d'un labo (le code source de la démo).
 *
 * Le sortir du HTML allège la page d'accueil d'autant ; le fichier n'est
 * téléchargé que si l'on clique. Le service worker le met en cache comme
 * n'importe quelle autre ressource.
 */
export const GET: APIRoute = () => {
  // Les clés de service ne doivent pas partir dans un fichier public : elles
  // sont injectées séparément dans le bootstrap (et restreintes par domaine).
  const { analytics, ...rest } = content;
  const payload = {
    ...rest,
    contact: { ...content.contact, web3formsKey: undefined },
  };

  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
