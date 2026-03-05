function isPrivateIpv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) {
    return false;
  }

  const octets = match.slice(1).map((part) => Number.parseInt(part, 10));
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const a = octets[0] ?? -1;
  const b = octets[1] ?? -1;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 0) return true;

  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized =
    hostname
      .toLowerCase()
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .split("%")[0] ?? "";
  if (!normalized.includes(":")) {
    return false;
  }

  if (normalized === "::1" || normalized === "::") {
    return true;
  }

  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  if (normalized.startsWith("fe80")) {
    return true;
  }

  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  if (!normalized) {
    return true;
  }

  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    return true;
  }

  if (normalized === "0.0.0.0") {
    return true;
  }

  if (normalized.endsWith(".local")) {
    return true;
  }

  return false;
}

export function isPrivateUrl(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return true;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return true;
  }

  const hostname = parsed.hostname;
  if (isBlockedHostname(hostname)) {
    return true;
  }

  if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
    return true;
  }

  return false;
}

export function validateFetchUrl(urlString: string): void {
  if (isPrivateUrl(urlString)) {
    throw new Error("Blocked private or unsupported URL");
  }
}
