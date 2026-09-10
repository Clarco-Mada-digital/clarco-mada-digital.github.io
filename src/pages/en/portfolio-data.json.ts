import type { APIRoute } from "astro";
import { portfolioDataResponse } from "../../lib/portfolio-data";

/** Version anglaise, servie sous /en/ — voir lib/portfolio-data.ts. */
export const GET: APIRoute = () => portfolioDataResponse("en");
