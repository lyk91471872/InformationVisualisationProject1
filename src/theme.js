export function readTheme() {
  const s = getComputedStyle(document.documentElement);

  return {
    fg:   s.getPropertyValue("--text-color").trim(),
    bg:   s.getPropertyValue("--bg-color").trim(),
    muted: s.getPropertyValue("--muted-text-color").trim(),
    note:  s.getPropertyValue("--note-text-color").trim(),
    font: "system-ui, sans-serif"
  };
}
