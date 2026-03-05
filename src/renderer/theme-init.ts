/**
 * theme-init.ts
 * Import this as the FIRST import in any sub-window entry point (.tsx).
 *
 * 1. Applies the saved theme (light/dark) BEFORE React renders — prevents flash.
 * 2. Marks html/body as `is-transparent-window` so globals.css keeps background
 *    transparent (these windows are frameless Electron windows with transparent:true).
 */
const saved = localStorage.getItem("theme");
const theme = saved === "light" ? "light" : "dark";
document.documentElement.setAttribute("data-theme", theme);
document.body.setAttribute("data-theme", theme);

// Sub-windows are transparent Electron windows — body MUST remain transparent.
document.documentElement.classList.add("is-transparent-window");
document.body.classList.add("is-transparent-window");
// Belt-and-suspenders: inline style runs before CSS module is parsed.
document.documentElement.style.background = "transparent";
document.body.style.background = "transparent";
