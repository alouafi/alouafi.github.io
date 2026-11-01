import { getCollection } from "astro:content";
import backlog from "../data/letterboxd-reviews.json";
import type { ReviewSource } from "../lib/letterboxd";
import { topicHref, topics } from "../lib/posts";

const escapeXml = (value: string) =>
  value.replace(/[<>&'\"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });

export async function GET({ site }: { site: URL }) {
  const posts = await getCollection(
    "writing",
    ({ data }) => !data.draft && !data.link,
  );
  const paths = [
    "/",
    ...topics.map(topicHref),
    "/cannes/",
    ...posts.map((post) => `/writing/${post.id}/`),
    ...(backlog as ReviewSource[]).map((review) => `/reviews/${review.slug}/`),
  ];
  const urls = paths
    .map(
      (path) =>
        `<url><loc>${escapeXml(new URL(path, site).toString())}</loc></url>`,
    )
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
