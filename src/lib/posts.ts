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

export type Topic = Post["data"]["topic"];

// Where a page sits in the site menu.
export type Section = "home" | Topic | "reviews" | "cannes";

// Each topic has its own listing page, in this order in the navigation.
export const topicPages = {
  cinema: { slug: "cinema", label: "Cinema" },
  tech: { slug: "tech", label: "Tech" },
  notes: { slug: "other", label: "Other" },
} as const satisfies Record<Topic, { slug: string; label: string }>;

export const topics = Object.keys(topicPages) as Topic[];

export const topicHref = (topic: Topic) => `/${topicPages[topic].slug}/`;

export const topicFeedHref = (topic: Topic) => `${topicHref(topic)}rss.xml`;
