import { describe, expect, it } from "vitest";
import { resolveServiceWorkerUrl } from "./service-worker-url";

describe("service worker URL resolution", () => {
  it("resolves a relative base at the site root", () => {
    expect(resolveServiceWorkerUrl("./", "https://example.test/index.html").href).toBe("https://example.test/sw.js");
  });

  it("resolves a relative base under a project subdirectory", () => {
    expect(resolveServiceWorkerUrl("./", "https://example.test/fieldfix/index.html").href).toBe(
      "https://example.test/fieldfix/sw.js"
    );
  });

  it("keeps an explicit project base relative to the document URL", () => {
    expect(resolveServiceWorkerUrl("/fieldfix/", "https://example.test/fieldfix/index.html").href).toBe(
      "https://example.test/fieldfix/sw.js"
    );
  });
});
