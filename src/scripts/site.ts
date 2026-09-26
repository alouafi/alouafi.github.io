const menuButton =
  document.querySelector<HTMLButtonElement>("[data-menu-button]");
const menu = document.querySelector<HTMLElement>("[data-menu]");

const setMenuOpen = (open: boolean) => {
  if (!menuButton || !menu) return;
  menuButton.setAttribute("aria-expanded", String(open));
  menu.classList.toggle("is-open", open);
  document.body.classList.toggle("menu-open", open);
};

menuButton?.addEventListener("click", () => {
  setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
});

menu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenuOpen(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenuOpen(false);
});

// Header timecode: HH:MM:SS:FF at 24 fps since the page opened.
const timecode = document.querySelector<HTMLElement>("[data-timecode]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (timecode && !reduceMotion.matches) {
  const start = performance.now();
  const pad = (value: number) => String(value).padStart(2, "0");
  let lastFrame = -1;

  const tick = (now: number) => {
    const frames = Math.floor(((now - start) / 1000) * 24);
    if (frames !== lastFrame) {
      lastFrame = frames;
      const seconds = Math.floor(frames / 24);
      timecode.textContent = [
        Math.floor(seconds / 3600),
        Math.floor(seconds / 60) % 60,
        seconds % 60,
        frames % 24,
      ]
        .map(pad)
        .join(":");
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
