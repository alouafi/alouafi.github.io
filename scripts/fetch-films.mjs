// Finds each reviewed film on TMDB and records its directors and its poster
// and backdrop paths in src/data/films.json. Images are served from TMDB's CDN.
//
//   npm run fetch:films            # only films not matched yet
//   npm run fetch:films -- --all   # match every film again
//
// Needs TMDB_TOKEN in .env: either the API key or the API read access token
// from themoviedb.org → Settings → API.
//
// To fix a wrong match, replace its entry with the right TMDB id, for example
// { "tmdbId": 1027273, "match": "manual" }, adding "tmdbType": "tv" for a
// series, and run the script again. Manual entries are never searched again.
// The same works for a film with no review, such as one a post links to with
// its `film` frontmatter: add the entry under any key and run the script.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const token = process.env.TMDB_TOKEN;
if (!token) {
  console.error(
    "Set TMDB_TOKEN in .env (see the comment at the top of this script).",
  );
  process.exit(1);
}

const reviewsFile = new URL(
  "../src/data/letterboxd-reviews.json",
  import.meta.url,
);
const filmsFile = new URL("../src/data/films.json", import.meta.url);
const reviews = JSON.parse(readFileSync(reviewsFile, "utf8"));
const films = existsSync(filmsFile)
  ? JSON.parse(readFileSync(filmsFile, "utf8"))
  : {};
const refreshAll = process.argv.includes("--all");

// The read access token is a JWT used as a bearer token; the shorter API key
// goes in the query string.
const tmdb = async (path, params) => {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  for (const [name, value] of Object.entries(params))
    url.searchParams.set(name, value);
  const headers = { accept: "application/json" };
  if (token.startsWith("eyJ")) headers.authorization = `Bearer ${token}`;
  else url.searchParams.set("api_key", token);
  const response = await fetch(url, { headers });
  if (!response.ok)
    throw new Error(`TMDB answered ${response.status} for ${path}`);
  return response.json();
};

const normalize = (title) =>
  title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const releaseYear = (movie) => movie.release_date?.slice(0, 4) ?? "";

const details = async (id, type) => {
  const item = await tmdb(`/${type}/${id}`, {});
  return {
    tmdbTitle: item.title ?? item.name,
    releaseDate: item.release_date || item.first_air_date || null,
    backdrop: item.backdrop_path,
    poster: item.poster_path,
  };
};

const directorsOf = async (id, type) => {
  if (type === "tv") {
    const { crew = [] } = await tmdb(`/tv/${id}/aggregate_credits`, {});
    return [
      ...new Set(
        crew
          .filter((person) =>
            person.jobs?.some((job) => job.job === "Director"),
          )
          .map((person) => person.name),
      ),
    ];
  }
  const { crew = [] } = await tmdb(`/movie/${id}/credits`, {});
  return crew
    .filter((person) => person.job === "Director")
    .map((person) => person.name);
};

const findMovie = async (title, year) => {
  // Letterboxd takes its titles and years from TMDB, so an exact title and
  // year is usually unique. Fall back to looser searches when it isn't.
  for (const params of [{ primary_release_year: year }, { year }, {}]) {
    const { results } = await tmdb("/search/movie", {
      query: title,
      include_adult: "false",
      ...params,
    });
    if (results.length === 0) continue;
    const sameTitle = results.filter(
      (movie) =>
        normalize(movie.title) === normalize(title) ||
        normalize(movie.original_title) === normalize(title),
    );
    const exact = sameTitle.filter((movie) => releaseYear(movie) === year);
    const pool =
      exact.length > 0 ? exact : sameTitle.length > 0 ? sameTitle : results;
    const [movie] = [...pool].sort((a, b) => b.popularity - a.popularity);
    const match =
      exact.length === 1
        ? "exact"
        : exact.length > 1
          ? "ambiguous"
          : "uncertain";
    return { movie, match };
  }
  return { movie: null, match: "none" };
};

const report = [];
for (const [key, film] of Object.entries(films)) {
  if (film.match !== "manual" || !film.tmdbId) continue;
  if (!refreshAll && film.backdrop !== undefined) continue;
  const { tmdbId, tmdbType } = film;
  films[key] = {
    tmdbId,
    ...(tmdbType ? { tmdbType } : {}),
    ...(await details(tmdbId, tmdbType ?? "movie")),
    match: "manual",
  };
}

for (const review of reviews) {
  const current = films[review.slug];
  if (current?.match === "manual") continue;
  if (current && !refreshAll) continue;
  const { movie, match } = await findMovie(review.title, review.year);
  films[review.slug] = movie
    ? {
        tmdbId: movie.id,
        tmdbTitle: movie.title,
        releaseDate: movie.release_date || null,
        backdrop: movie.backdrop_path,
        poster: movie.poster_path,
        match,
      }
    : { tmdbId: null, backdrop: null, poster: null, match };
  if (match !== "exact")
    report.push(
      `${match.padEnd(9)} ${review.title} (${review.year}) → ${movie ? `${movie.title} (${releaseYear(movie)}), id ${movie.id}` : "nothing"}`,
    );
  await new Promise((resolve) => setTimeout(resolve, 60));
}

for (const film of Object.values(films)) {
  if (film.tmdbId && film.directors === undefined) {
    film.directors = await directorsOf(film.tmdbId, film.tmdbType ?? "movie");
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
}

const fields = [
  "tmdbId",
  "tmdbType",
  "tmdbTitle",
  "releaseDate",
  "directors",
  "backdrop",
  "poster",
  "match",
];
const sorted = Object.fromEntries(
  Object.entries(films)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, film]) => [
      slug,
      Object.fromEntries(
        fields
          .filter((field) => field in film)
          .map((field) => [field, film[field]]),
      ),
    ]),
);
writeFileSync(filmsFile, `${JSON.stringify(sorted, null, 2)}\n`);

const entries = Object.values(sorted);
console.log(
  `${entries.length} films: ${entries.filter((e) => e.backdrop).length} with a backdrop, ${entries.filter((e) => !e.backdrop && e.poster).length} with only a poster, ${entries.filter((e) => !e.backdrop && !e.poster).length} without images.`,
);
if (report.length > 0)
  console.log(`Check these matches:\n${report.join("\n")}`);
