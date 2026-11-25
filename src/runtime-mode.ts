export type RuntimeMode = "LOCAL_DEMO" | "STANDARD";

export interface RuntimeEnv {
  VITE_FIELD_FIX_LOCAL_DEMO?: string;
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
  VITE_RECAPTCHA_V3_SITE_KEY?: string;
}

export interface RuntimeConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  recaptchaSiteKey: string;
}

/**
 * These are intentionally fictional values for a local Chrome demonstration.
 * They must never be replaced with a real project's values in a committed file.
 */
export const LOCAL_DEMO_CONFIG: RuntimeConfig = {
  apiKey: "fieldfix-local-demo-api-key",
  authDomain: "fieldfix-local-demo.invalid",
  projectId: "fieldfix-local-demo",
  appId: "fieldfix-local-demo-app-id",
  recaptchaSiteKey: "fieldfix-local-demo-recaptcha-site-key"
};

function value(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function runtimeConfig(env: RuntimeEnv): RuntimeConfig {
  return {
    apiKey: value(env.VITE_FIREBASE_API_KEY),
    authDomain: value(env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: value(env.VITE_FIREBASE_PROJECT_ID),
    appId: value(env.VITE_FIREBASE_APP_ID),
    recaptchaSiteKey: value(env.VITE_RECAPTCHA_V3_SITE_KEY)
  };
}

export function isLocalDemoConfig(config: RuntimeConfig): boolean {
  return Object.entries(LOCAL_DEMO_CONFIG).every(([key, expected]) => config[key as keyof RuntimeConfig] === expected);
}

function hasUsableConfig(config: RuntimeConfig): boolean {
  return Object.values(config).every((item) => item.length > 0 && !item.startsWith("replace-with"));
}

export function resolveRuntimeMode(env: RuntimeEnv): RuntimeMode {
  const config = runtimeConfig(env);
  // The opt-in flag alone is never enough: demo mode requires the complete,
  // exact fictional fixture, so a real project cannot accidentally be forced
  // into the demo policy.
  return env.VITE_FIELD_FIX_LOCAL_DEMO?.trim().toLowerCase() === "true" && isLocalDemoConfig(config)
    ? "LOCAL_DEMO"
    : "STANDARD";
}

export function isFirebaseConfigured(env: RuntimeEnv): boolean {
  const config = runtimeConfig(env);
  if (isLocalDemoConfig(config)) {
    return env.VITE_FIELD_FIX_LOCAL_DEMO?.trim().toLowerCase() === "true";
  }
  return hasUsableConfig(config);
}

export function allowCloudFallback(env: RuntimeEnv, requested: boolean): boolean {
  // This is the security boundary: local demo mode can never select a cloud route,
  // even if a caller or stale UI state requests one.
  return resolveRuntimeMode(env) === "LOCAL_DEMO" ? false : requested;
}

export function inferenceMode(env: RuntimeEnv, requestedCloudFallback: boolean): "ONLY_ON_DEVICE" | "PREFER_ON_DEVICE" {
  return allowCloudFallback(env, requestedCloudFallback) ? "PREFER_ON_DEVICE" : "ONLY_ON_DEVICE";
}
