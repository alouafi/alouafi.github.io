// Parses and renders the Letterboxd diary feed. Shared by the site build,
// the Cinema page script, and the relay worker in workers/letterboxd/.

export interface Film {
  title: string;
  year: string;
  rating: number | null;
  rewatch: boolean;
  liked: boolean;
  watchedDate: string;
  url: string;
  poster: string | null;
}

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

const decode = (text: string) =>
  text
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (entity.startsWith("#x"))
        return String.fromCodePoint(parseInt(entity.slice(2), 16));
      if (entity.startsWith("#"))
        return String.fromCodePoint(parseInt(entity.slice(1), 10));
      return entities[entity.toLowerCase()] ?? match;
    })
    .trim();

const field = (item: string, name: string) => {
  const value = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1];
  return value === undefined ? "" : decode(value);
};

// The feed links 600 × 900 posters; 300 × 450 is plenty and much lighter.
const smallPoster = (url: string) =>
  url.replace(/-0-\d+-0-\d+-crop/, "-0-300-0-450-crop");

export const parseLetterboxdFeed = (xml: string, limit = 8): Film[] =>
  [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(([, item = ""]) => {
      const rating = Number.parseFloat(field(item, "letterboxd:memberRating"));
      const poster = field(item, "description").match(
        /<img src="([^"]+)"/,
      )?.[1];
      return {
        title: field(item, "letterboxd:filmTitle"),
        year: field(item, "letterboxd:filmYear"),
        rating: Number.isNaN(rating) ? null : rating,
        rewatch: field(item, "letterboxd:rewatch") === "Yes",
        liked: field(item, "letterboxd:memberLike") === "Yes",
        watchedDate: field(item, "letterboxd:watchedDate"),
        url: field(item, "link"),
        poster: poster ? smallPoster(decode(poster)) : null,
      };
    })
    // Lists also appear in the feed; only diary entries name a film.
    .filter((film) => film.title && film.watchedDate)
    .sort((a, b) => b.watchedDate.localeCompare(a.watchedDate))
    .slice(0, limit);

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] ?? character,
  );

const stars = (rating: number) =>
  "★".repeat(Math.floor(rating)) + (rating % 1 ? "½" : "");

const watchedOn = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

// Returns list items as an HTML string so the build and the browser render
// exactly the same markup.
export const renderFilms = (films: Film[]) =>
  films
    .map((film) => {
      const meta = [
        film.rating === null
          ? ""
          : `<span aria-hidden="true">${stars(film.rating)}</span><span class="visually-hidden">Rated ${film.rating} out of 5</span>`,
        film.rewatch
          ? `<span aria-hidden="true">↻</span><span class="visually-hidden">, rewatched</span>`
          : "",
        film.liked
          ? `<span aria-hidden="true">♥</span><span class="visually-hidden">, liked</span>`
          : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<li class="film">
  <a href="${escapeHtml(film.url)}" rel="noreferrer">
    <span class="film-poster">${
      film.poster
        ? `<img src="${escapeHtml(film.poster)}" alt="" width="300" height="450" loading="lazy" decoding="async">`
        : ""
    }</span>
    <span class="film-title">${escapeHtml(film.title)}</span>
    <span class="film-meta"><span class="film-rating">${meta}</span><time datetime="${escapeHtml(film.watchedDate)}">${watchedOn(film.watchedDate)}</time></span>
  </a>
</li>`;
    })
    .join("");
