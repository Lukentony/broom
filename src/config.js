let cachedBaseUrl = null;

export async function getApiBaseUrl() {
  if (cachedBaseUrl) return cachedBaseUrl;

  try {
    const res = await fetch('/runtime-config.json');
    const config = await res.json();
    if (config.apiBaseUrl !== undefined) {
      cachedBaseUrl = config.apiBaseUrl;
      return cachedBaseUrl;
    }
  } catch (e) {
    // Silently fallback
  }

  // Fallback: stesso host/protocollo ma porta 8000
  const url = new URL(window.location.origin);
  url.port = "8000";
  cachedBaseUrl = url.origin;
  return cachedBaseUrl;
}
