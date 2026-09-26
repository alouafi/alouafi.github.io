import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"writing">;

export const getPublishedPosts = async () =>
  (await getCollection("writing", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
  );

export const postHref = (post: Post) =>
  post.data.link ?? `/writing/${post.id}/`;

export const isExternal = (href: string) => href.startsWith("http");

export const formatDate = (post: Post, month: "short" | "long" = "short") =>
  post.data.publishedAt.toLocaleDateString(
    post.data.language === "fr" ? "fr-FR" : "en-GB",
    { day: "2-digit", month, year: "numeric" },
  );

export const readingMinutes = (body = "") =>
  Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 230));
