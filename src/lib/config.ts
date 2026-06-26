/**
 * Chemin (secret) de la console d'administration.
 * Volontairement non devinable — on n'utilise PAS « /admin ».
 * Pour le changer : renomme aussi le fichier src/pages/<ce-slug>.astro
 * et la ligne Disallow de public/robots.txt.
 */
export const ADMIN_PATH = "clarco-console";
