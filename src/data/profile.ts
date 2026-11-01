export const profile = {
  name: "Aïmen Louafi",
  role: "AI Engineer",
  employer: "Mistral AI",
  portrait: "/assets/img/profile.webp",
  links: {
    github: "https://github.com/alouafi",
    linkedin: "https://www.linkedin.com/in/aimen-louafi",
    letterboxd: "https://letterboxd.com/endtell/",
  },
  // Cloudflare Worker in workers/letterboxd/ that serves the diary feed as JSON.
  letterboxdRelay: "https://letterboxd-feed.alouafi-github-io.workers.dev/",
} as const;
