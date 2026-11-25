import { describe, expect, it } from "vitest";
import {
  LOCAL_DEMO_CONFIG,
  allowCloudFallback,
  inferenceMode,
  isFirebaseConfigured,
  isLocalDemoConfig,
  resolveRuntimeMode,
  type RuntimeEnv
} from "./runtime-mode";

const demoEnv: RuntimeEnv = {
  VITE_FIELD_FIX_LOCAL_DEMO: "true",
  VITE_FIREBASE_API_KEY: LOCAL_DEMO_CONFIG.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: LOCAL_DEMO_CONFIG.authDomain,
  VITE_FIREBASE_PROJECT_ID: LOCAL_DEMO_CONFIG.projectId,
  VITE_FIREBASE_APP_ID: LOCAL_DEMO_CONFIG.appId,
  VITE_RECAPTCHA_V3_SITE_KEY: LOCAL_DEMO_CONFIG.recaptchaSiteKey
};

describe("runtime routing policy", () => {
  it("recognizes only the explicit complete fictional fixture as local demo", () => {
    expect(resolveRuntimeMode(demoEnv)).toBe("LOCAL_DEMO");
    expect(isLocalDemoConfig({
      apiKey: LOCAL_DEMO_CONFIG.apiKey,
      authDomain: LOCAL_DEMO_CONFIG.authDomain,
      projectId: LOCAL_DEMO_CONFIG.projectId,
      appId: LOCAL_DEMO_CONFIG.appId,
      recaptchaSiteKey: LOCAL_DEMO_CONFIG.recaptchaSiteKey
    })).toBe(true);
    expect(isFirebaseConfigured(demoEnv)).toBe(true);
  });

  it("forces ONLY_ON_DEVICE and rejects cloud fallback in local demo mode", () => {
    expect(allowCloudFallback(demoEnv, true)).toBe(false);
    expect(inferenceMode(demoEnv, true)).toBe("ONLY_ON_DEVICE");
    expect(inferenceMode(demoEnv, false)).toBe("ONLY_ON_DEVICE");
  });

  it("does not treat a real-looking standard config as local demo", () => {
    const standardEnv: RuntimeEnv = {
      VITE_FIELD_FIX_LOCAL_DEMO: "false",
      VITE_FIREBASE_API_KEY: "real-project-key-not-committed",
      VITE_FIREBASE_AUTH_DOMAIN: "authorized-project.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "authorized-project",
      VITE_FIREBASE_APP_ID: "real-app-id",
      VITE_RECAPTCHA_V3_SITE_KEY: "real-site-key-not-committed"
    };
    expect(resolveRuntimeMode(standardEnv)).toBe("STANDARD");
    expect(isFirebaseConfigured(standardEnv)).toBe(true);
    expect(allowCloudFallback(standardEnv, true)).toBe(true);
    expect(inferenceMode(standardEnv, true)).toBe("PREFER_ON_DEVICE");
  });

  it("fails closed when the demo flag is set with a mismatched config", () => {
    const mismatched = { ...demoEnv, VITE_FIREBASE_PROJECT_ID: "not-the-fixture" };
    expect(resolveRuntimeMode(mismatched)).toBe("STANDARD");
    expect(isFirebaseConfigured(mismatched)).toBe(true);
  });

  it("does not treat the fictional fixture as a standard cloud configuration", () => {
    expect(isFirebaseConfigured({ ...demoEnv, VITE_FIELD_FIX_LOCAL_DEMO: "false" })).toBe(false);
  });
});
