// Imports reviews from a Letterboxd data export (Settings → Data → Export
// your data) into src/data/letterboxd-reviews.json.
//
//   npm run import:reviews -- ~/Downloads/letterboxd-<user>-<date>.zip
//
// Accepts the export zip, the unzipped folder, or reviews.csv itself.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const input = process.argv[2];
if (!input) {
  console.error(
    "Usage: npm run import:reviews -- <export zip, folder, or reviews.csv>",
  );
  process.exit(1);
}

const readCsv = (path) => {
  if (statSync(path).isDirectory())
    return readFileSync(join(path, "reviews.csv"), "utf8");
  if (path.endsWith(".zip"))
    return execFileSync("unzip", ["-p", path, "reviews.csv"], {
      encoding: "utf8",
    });
  return readFileSync(path, "utf8");
};

// RFC 4180: quoted fields may contain commas, quotes ("") and line breaks.
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  if (value || row.length > 0) rows.push([...row, value]);
  return rows.filter((cells) => cells.some(Boolean));
};

const [header, ...records] = parseCsv(readCsv(input).replace(/^﻿/, ""));
const column = (name) => {
  const index = header.indexOf(name);
  if (index === -1) throw new Error(`reviews.csv has no "${name}" column`);
  return index;
};
const columns = Object.fromEntries(
  [
    "Date",
    "Name",
    "Year",
    "Letterboxd URI",
    "Rating",
    "Review",
    "Watched Date",
  ].map((name) => [name, column(name)]),
);

const slugify = (value) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Review pages live at /reviews/<slug>/, so slugs must stay unique.
const taken = new Set();
const uniqueSlug = (title, year) => {
  const base = `${slugify(title) || "review"}-${year}`;
  let slug = base;
  for (let suffix = 2; taken.has(slug); suffix += 1) slug = `${base}-${suffix}`;
  taken.add(slug);
  return slug;
};

const reviews = records
  .map((cells) => ({
    title: cells[columns.Name],
    year: cells[columns.Year],
    rating: cells[columns.Rating] ? Number(cells[columns.Rating]) : null,
    date: cells[columns.Date],
    watchedDate: cells[columns["Watched Date"]] || cells[columns.Date],
    url: cells[columns["Letterboxd URI"]],
    text: cells[columns.Review].replace(/\r\n?/g, "\n").trim(),
    // The export has no spoiler flag; set it by hand for reviews that need one.
    spoilers: false,
  }))
  .filter((review) => review.title && review.text)
  .sort(
    (a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title),
  )
  .map((review) => ({
    slug: uniqueSlug(review.title, review.year),
    ...review,
  }));

const output = new URL("../src/data/letterboxd-reviews.json", import.meta.url);
writeFileSync(output, `${JSON.stringify(reviews, null, 2)}\n`);
console.log(
  `Imported ${reviews.length} reviews (${reviews.at(-1)?.date} to ${reviews[0]?.date}).`,
);
