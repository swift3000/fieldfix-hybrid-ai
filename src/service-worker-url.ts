export function resolveServiceWorkerUrl(basePath: string, documentBaseUrl: string): URL {
  const appBaseUrl = new URL(basePath, documentBaseUrl);
  return new URL("sw.js", appBaseUrl);
}
