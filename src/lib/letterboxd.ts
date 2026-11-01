// Parses and renders Letterboxd diary entries and reviews. Shared by the site
// build, the Cinema page script, and the relay worker in workers/letterboxd/.

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

// A full review, as stored in src/data/letterboxd-reviews.json.
export interface ReviewSource {
  title: string;
  year: string;
  rating: number | null;
  date: string;
  url: string;
  text: string;
  spoilers: boolean;
}

// What the Cinema page shows for a review.
export interface Review {
  title: string;
  year: string;
  rating: number | null;
  date: string;
  url: string;
  label: string | null;
  excerpt: string;
  lang: "en" | "fr";
  spoilers: boolean;
}

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
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
  const value = item.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`),
  )?.[1];
  return value === undefined ? "" : decode(value);
};

const parseRating = (value: string) => {
  const rating = Number.parseFloat(value);
  return Number.isNaN(rating) ? null : rating;
};

// The feed links 600 × 900 posters; 300 × 450 is plenty and much lighter.
const smallPoster = (url: string) =>
  url.replace(/-0-\d+-0-\d+-crop/, "-0-300-0-450-crop");

const plainText = (html: string) =>
  decode(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""));

const paragraphs = (text: string) =>
  text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => plainText(paragraph).replace(/\s+/g, " "))
    .filter(Boolean);

const frenchWords =
  /\b(?:le|la|les|des|une|est|qui|que|dans|pas|du|ce|sur|pour|avec|mais|plus|ses|son|aux)\b/gi;
const englishWords =
  /\b(?:the|and|is|of|to|in|that|it|with|for|this|was|but|his|her|are|an)\b/gi;

const guessLanguage = (text: string): "en" | "fr" =>
  (text.match(frenchWords)?.length ?? 0) >
  (text.match(englishWords)?.length ?? 0)
    ? "fr"
    : "en";

const excerptLength = 280;

export const toReview = (source: ReviewSource): Review => {
  const parts = paragraphs(source.text);
  // Reviews often open with a short context line such as "Cannes 2026".
  const label =
    parts.length > 1 && (parts[0]?.length ?? 0) < 60 ? parts.shift() : null;
  const body = parts.join(" ");
  const cut = body.lastIndexOf(" ", excerptLength);
  const excerpt =
    body.length > excerptLength
      ? `${body.slice(0, cut > 0 ? cut : excerptLength).replace(/[\s,;:.]+$/, "")}…`
      : body;
  return {
    title: source.title,
    year: source.year,
    rating: source.rating,
    date: source.date,
    url: source.url,
    label: label ?? null,
    // Spoiler reviews only link to Letterboxd, which hides their text too.
    excerpt: source.spoilers ? "" : excerpt,
    lang: guessLanguage(body),
    spoilers: source.spoilers,
  };
};

// Merges review lists, keeping the newest review of each film.
export const latestReviews = (lists: Review[][], limit = 4) => {
  const byFilm = new Map<string, Review>();
  for (const review of lists.flat()) {
    const key = `${review.title}|${review.year}`;
    const current = byFilm.get(key);
    if (!current || review.date >= current.date) byFilm.set(key, review);
  }
  return [...byFilm.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
};

export const parseLetterboxdFeed = (xml: string, limit = 8) => {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(
    ([, item = ""]) => item,
  );

  const films: Film[] = items
    .map((item) => {
      const poster = field(item, "description").match(
        /<img src="([^"]+)"/,
      )?.[1];
      return {
        title: field(item, "letterboxd:filmTitle"),
        year: field(item, "letterboxd:filmYear"),
        rating: parseRating(field(item, "letterboxd:memberRating")),
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

  const reviews = items
    .filter((item) => field(item, "guid").startsWith("letterboxd-review-"))
    .map((item) => {
      const description = field(item, "description");
      const text = [...description.matchAll(/<p>([\s\S]*?)<\/p>/g)]
        .map(([, paragraph = ""]) => paragraph)
        .filter((paragraph) => !/<img\b/.test(paragraph));
      const spoilers = text.some((paragraph) =>
        /review may contain spoilers/i.test(paragraph),
      );
      const published = new Date(field(item, "pubDate"));
      return toReview({
        title: field(item, "letterboxd:filmTitle"),
        year: field(item, "letterboxd:filmYear"),
        rating: parseRating(field(item, "letterboxd:memberRating")),
        date: Number.isNaN(published.valueOf())
          ? field(item, "letterboxd:watchedDate")
          : published.toISOString().slice(0, 10),
        url: field(item, "link"),
        text: text
          .filter(
            (paragraph) =>
              !/review may contain spoilers/i.test(paragraph) &&
              !/^\s*(?:Re)?watched on\b/i.test(plainText(paragraph)),
          )
          .join("\n\n"),
        spoilers,
      });
    })
    .filter((review) => review.title);

  return { films, reviews: latestReviews([reviews]) };
};

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

const ratingHtml = (rating: number | null) =>
  rating === null
    ? ""
    : `<span aria-hidden="true">${stars(rating)}</span><span class="visually-hidden">Rated ${rating} out of 5</span>`;

const formatDate = (date: string, withYear: boolean) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });

// Both renderers return HTML strings so the build and the browser produce
// exactly the same markup.
export const renderFilms = (films: Film[]) =>
  films
    .map((film) => {
      const meta = [
        ratingHtml(film.rating),
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
    <span class="film-meta"><span class="film-rating">${meta}</span><time datetime="${escapeHtml(film.watchedDate)}">${formatDate(film.watchedDate, false)}</time></span>
  </a>
</li>`;
    })
    .join("");

export const renderReviews = (reviews: Review[]) =>
  reviews
    .map(
      (review) => `<li class="review">
  ${review.label ? `<p class="review-label">${escapeHtml(review.label)}</p>` : ""}
  <h3 class="review-title"><a href="${escapeHtml(review.url)}" rel="noreferrer">${escapeHtml(review.title)}<span class="visually-hidden">, review on Letterboxd</span></a> <span class="review-year">${escapeHtml(review.year)}</span></h3>
  <p class="review-meta"><span class="film-rating">${ratingHtml(review.rating)}</span><time datetime="${escapeHtml(review.date)}">${formatDate(review.date, true)}</time></p>
  ${
    review.spoilers
      ? `<p class="review-excerpt review-spoiler">Contains spoilers.</p>`
      : `<p class="review-excerpt" lang="${review.lang}">${escapeHtml(review.excerpt)}</p>`
  }
  <p class="review-more" aria-hidden="true">Read on Letterboxd ↗</p>
</li>`,
    )
    .join("");
