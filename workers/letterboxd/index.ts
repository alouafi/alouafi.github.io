// Relays the Letterboxd diary feed as JSON with CORS headers, so the Cinema
// page can show recent films and reviews without waiting for a site rebuild.
import { profile } from "../../src/data/profile";
import {
  parseLetterboxdFeed,
  type Film,
  type Review,
} from "../../src/lib/letterboxd";

const feedUrl = `${profile.links.letterboxd}rss/`;
// Each worker instance asks Letterboxd at most once every five minutes.
const freshForMs = 5 * 60 * 1000;

let latest: { films: Film[]; reviews: Review[]; fetchedAt: string } | undefined;
let latestAt = 0;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=60",
    },
  });

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, {
        status: 405,
        headers: { allow: "GET, HEAD" },
      });
    }
    if (latest && Date.now() - latestAt < freshForMs) return json(latest);

    try {
      const response = await fetch(feedUrl, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; alouafi.github.io Letterboxd relay)",
        },
      });
      if (!response.ok)
        throw new Error(`Letterboxd answered ${response.status}`);
      const { films, reviews } = parseLetterboxdFeed(await response.text());
      if (films.length === 0) throw new Error("The feed has no diary entries");
      latest = { films, reviews, fetchedAt: new Date().toISOString() };
      latestAt = Date.now();
      return json(latest);
    } catch (error) {
      // An older list is better than none while Letterboxd is unreachable.
      if (latest) return json({ ...latest, stale: true });
      const message = error instanceof Error ? error.message : String(error);
      return json({ error: message }, 502);
    }
  },
};
