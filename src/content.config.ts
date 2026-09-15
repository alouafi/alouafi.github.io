import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const writing = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/writing" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    language: z.enum(["en", "fr"]),
    topic: z.enum(["tech", "cinema", "notes"]),
    format: z.enum(["post", "paper"]).default("post"),
    authors: z.array(z.string()).optional(),
    director: z.string().optional(),
    publisher: z.string().optional(),
    externalUrl: z.url().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { writing };
