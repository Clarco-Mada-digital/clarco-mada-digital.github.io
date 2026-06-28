import { defineCollection, z } from "astro:content";

// Collection « blog » : articles Markdown dans src/content/blog/*.md
const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    /** Image de couverture (URL ou chemin local). Optionnelle. */
    cover: z.string().optional(),
  }),
});

export const collections = { blog };
