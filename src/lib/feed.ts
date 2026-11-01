import { postHref, type Post } from "./posts";

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

interface Feed {
  site: URL;
  title: string;
  description: string;
  path: string;
  posts: Post[];
}

export const feedResponse = ({
  site,
  title,
  description,
  path,
  posts,
}: Feed) => {
  const items = posts
    .map((post) => {
      const url = new URL(postHref(post), site).toString();
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
        <title>${escapeXml(title)}</title>
        <description>${escapeXml(description)}</description>
        <link>${new URL(path, site).toString()}</link>
        ${items}
      </channel>
    </rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
