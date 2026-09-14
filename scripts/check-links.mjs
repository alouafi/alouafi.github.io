import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";

const outputDirectory = resolve("dist");

const walk = (directory) =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const resolveTarget = (page, target) => {
  const cleanTarget = target.split(/[?#]/, 1)[0];
  if (!cleanTarget) return null;

  const absolute = cleanTarget.startsWith("/")
    ? join(outputDirectory, cleanTarget)
    : resolve(dirname(page), cleanTarget);

  if (cleanTarget.endsWith("/")) return join(absolute, "index.html");
  if (extname(absolute)) return absolute;
  if (existsSync(absolute)) return absolute;
  return join(absolute, "index.html");
};

if (!existsSync(outputDirectory)) {
  throw new Error("dist/ does not exist. Run `npm run build` first.");
}

const pages = walk(outputDirectory).filter((path) => path.endsWith(".html"));
const failures = [];

for (const page of pages) {
  const html = readFileSync(page, "utf8");
  const references = html.matchAll(/(?:href|src)="([^"]+)"/g);

  for (const [, target] of references) {
    if (!target || /^(?:https?:|mailto:|tel:|data:|#)/.test(target)) continue;
    const resolved = resolveTarget(page, target);
    if (resolved && !existsSync(resolved)) {
      failures.push(`${page.replace(`${outputDirectory}/`, "")} → ${target}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Found ${failures.length} broken internal reference(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `Checked ${pages.length} generated HTML pages: no broken internal references.`,
  );
}
