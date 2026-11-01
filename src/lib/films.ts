// Film details from TMDB (see npm run fetch:films), keyed by review slug or
// by the `film` frontmatter of a post.
import films from "../data/films.json";

export interface Film {
  tmdbId: number | null;
  tmdbType?: string;
  tmdbTitle?: string;
  releaseDate?: string | null;
  directors?: string[];
  backdrop?: string | null;
  poster?: string | null;
  match: string;
}

export const film = (key: string | undefined) =>
  (films as Record<string, Film | undefined>)[key ?? ""];

export const tmdbImage = (size: string, path: string) =>
  `https://image.tmdb.org/t/p/${size}${path}`;

export const posterUrl = (key: string | undefined, size = "w92") => {
  const path = film(key)?.poster;
  return path ? tmdbImage(size, path) : null;
};

const directorList = new Intl.ListFormat("fr", { type: "conjunction" });

export const directedBy = (key: string | undefined) => {
  const names = film(key)?.directors ?? [];
  return names.length > 0 ? directorList.format(names) : null;
};

// Films rated 3.5 out of 5 or more get a heart.
export const loved = (rating: number | null | undefined) =>
  rating !== null && rating !== undefined && rating >= 3.5;
