import type { APIRoute } from "astro";
import { portfolioDataResponse } from "../lib/portfolio-data";

/** Version française — voir lib/portfolio-data.ts pour le pourquoi. */
export const GET: APIRoute = () => portfolioDataResponse("fr");
