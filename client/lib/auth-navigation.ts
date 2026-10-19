export function safeReturnPath(value: string | null, fallback = "/dashboard") {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\") || [...value].some(character => character.charCodeAt(0) <= 32)) return fallback;
  try {
    const url = new URL(value, "https://app.invalid");
    return url.origin === "https://app.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch { return fallback; }
}

export function returnPathFromSearch(search: string) {
  const params = new URLSearchParams(search);
  return safeReturnPath(params.get("redirect") ?? params.get("redirect_url"));
}

export function authHref(path: string, destination: string) {
  return `${path}?${new URLSearchParams({ redirect: safeReturnPath(destination) })}`;
}
