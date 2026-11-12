// Pure parser for COROS MCP FIT-file links. Signed query parameters are
// essential; never truncate a URL at ".fit" or log its query string.
export function fitUrlsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const urls = new Set<string>();
  for (const match of text.matchAll(/https:\/\/[^\s"'<>]+/gi)) {
    const candidate = match[0].replace(/[),;]+$/, '');
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === 'https:' && /\.fit$/i.test(parsed.pathname)) urls.add(candidate);
    } catch { /* invalid URL: ignore */ }
  }
  return [...urls];
}
