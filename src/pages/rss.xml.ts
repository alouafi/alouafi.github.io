import { getCollection } from "astro:content";

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
  const posts = (
    await getCollection("writing", ({ data }) => !data.draft)
  ).sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());

  const items = posts
    .map((post) => {
      const url = post.data.link
        ? new URL(post.data.link, site).toString()
        : new URL(`/writing/${post.id}/`, site).toString();
      return `<item>
        <title>${escapeXml(post.data.title)}</title>
        <description>${escapeXml(post.data.description)}</description>
        <link>${escapeXml(url)}</link>
        <guid>${escapeXml(url)}</guid>
        <pubDate>${post.data.publishedAt.toUTCString()}</pubDate>
        <language>${post.data.language}</language>
      </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0">
      <channel>
        <title>Aïmen Louafi — Writing</title>
        <description>Posts about AI engineering, films, and other things.</description>
        <link>${site.toString()}</link>
        ${items}
      </channel>
    </rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
