import { getContent } from "./content";
import type { Locale } from "./i18n";

/**
 * Charge utile de /portfolio-data.json, dans une langue donnée.
 *
 * Ce contenu complet était auparavant sérialisé dans le HTML de la page
 * d'accueil (~116 Ko) alors que deux fonctionnalités seules en ont besoin, et
 * seulement sur action du visiteur : la génération du CV PDF et l'ouverture
 * d'un labo (le code source de la démo). Le sortir du HTML allège la page
 * d'autant ; le fichier n'est téléchargé que si l'on clique.
 *
 * Une version par langue : sans ça, ouvrir un labo depuis /en/ remplacerait
 * les titres anglais déjà affichés par leurs équivalents français.
 */
export function portfolioDataResponse(locale: Locale): Response {
  const content = getContent(locale);
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
}
