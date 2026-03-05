export type ThemeMode = "dark" | "light";

export const normalizeTheme = (
  themeValue: string | null | undefined,
): ThemeMode => (themeValue === "light" ? "light" : "dark");

export const applyThemeToRoot = (
  themeValue: string | null | undefined,
): ThemeMode => {
  const theme = normalizeTheme(themeValue);
  document.documentElement.setAttribute("data-theme", theme);
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  return theme;
};

export const emitThemeChanged = (theme: ThemeMode): void => {
  window.dispatchEvent(
    new CustomEvent("app:theme-changed", {
      detail: { theme },
    }),
  );
};
