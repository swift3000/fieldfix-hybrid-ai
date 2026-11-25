# FieldFix

**Turn a first look into a safer next step.**

> Pre-submission prototype · version 0.1.0. The current evidence includes an isolated local Chrome test using deliberately fictional Firebase configuration and synthetic inputs, plus one explicitly bounded cloud test using a real free Spark Firebase project. No credentials, API keys, App Check debug tokens, or personal data are included here.

FieldFix is a photo-first, offline-ready **first-response handoff** for office-printer interruptions. It turns one image, a short symptom, and an optional excerpt from the device's own guide into a bounded work order: what was reported, a few non-invasive checks, and a clear point to hand the case to qualified maintenance. It is not a repair diagnosis, a safety certification, or a general chat assistant.

## Why this is different

FieldFix focuses on the handoff artifact—not open-ended conversation. The product deliberately starts with one device family and one narrow moment: a printer has stopped, and a person needs a safe next step without guessing at a repair. A deterministic local guard catches common reports of smoke, fire, sparks, heat, liquid, or shock and replaces both user- and model-reported hazards with a fixed stop-and-escalate card. Invasive generated checks are filtered, uncertainty is explicit, and a human owns the final call.

The bundled printer illustration and sample work order are original, deterministic fixtures. The UI labels them **synthetic / not a photo** and **not AI**; they cannot be submitted to the live model.

## Privacy boundary

- The fixture workflow makes no AI request.
- The live route defaults to `ONLY_ON_DEVICE`. The app asks for an explicit, per-case choice before enabling `PREFER_ON_DEVICE` cloud fallback; it then shows a separate confirmation describing which case fields may be sent. Consent is reset when the photo or notes change.
- With cloud fallback enabled, the selected JPEG/PNG image, symptom, and optional guide excerpt may be sent to Google through Firebase AI Logic if Chrome cannot use its on-device model. Do not include names, passwords, account data, or other sensitive information.
- Before either local or consented cloud inference, the chosen JPEG/PNG is decoded, downscaled to a maximum 1600 px edge, and re-encoded in memory. The model receives this normalized copy without the source file's embedded metadata (such as EXIF location); the app does not persist the original or normalized image.
- The app does not create an account, upload a case to its own server, or persist photos and notes. Case data stays in this tab's memory; clearing the case or closing/reloading the tab discards it.
- Firebase configuration, App Check credentials, debug tokens, and provider keys are sensitive. Keep local configuration and tokens out of source control and public builds. A public app needs a registered production App Check attestation provider.

These are product safeguards, not a promise that a model or keyword guard will catch every hazard. Always follow the equipment manual, site safety procedures, and qualified maintenance advice.

## Local development

Use Node.js **24.12.0 or newer**, as required by the pinned Firebase AI Logic SDK package. On desktop Chrome, the web hybrid path requires a supported, available on-device model. The first model download may take several minutes.

```bash
npm ci
npm test
npm run build
npm run dev
```

Vite serves the app at `http://127.0.0.1:5173` by default. The deterministic fixture works without Firebase configuration. The production build is written to `dist/`; it is generated output and ignored by Git.

### Reproducible fictional local-demo mode

For a supported desktop Chrome that has Gemini Nano available, the live SDK path can be demonstrated without a real Firebase project or real key. This mode is deliberately opt-in and requires the complete fictional fixture; it is not a Firebase project configuration:

```bash
cp .env.example .env.local
# Edit .env.local: comment out the five replace-with lines and set:
VITE_FIELD_FIX_LOCAL_DEMO=true
VITE_FIREBASE_API_KEY=fieldfix-local-demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=fieldfix-local-demo.invalid
VITE_FIREBASE_PROJECT_ID=fieldfix-local-demo
VITE_FIREBASE_APP_ID=fieldfix-local-demo-app-id
VITE_RECAPTCHA_V3_SITE_KEY=fieldfix-local-demo-recaptcha-site-key
VITE_APPCHECK_DEBUG_TOKEN=false
npm run dev
```

Open the printed localhost URL in supported desktop Chrome, choose a real JPEG/PNG and an observable symptom, then run live triage. The app displays `Local demo · on-device only`, disables the cloud-consent control, and the SDK is forced to `ONLY_ON_DEVICE` even if a stale caller requests fallback. The exact fictional values and flag are checked in code; merely setting the flag with another configuration does not activate demo mode. Do not add real project values or tokens to `.env.example`, source control, screenshots, or a public build.

This mode is a constrained SDK-path demonstration only. The fictional configuration cannot connect to a Firebase project, and the demo instructions alone do not establish that a new run of on-device inference has succeeded. Gemini Nano availability, model preparation, browser support, and App Check behavior still depend on the local Chrome/device. The mode does not prove cloud fallback, production App Check attestation/enforcement, production security rules, billing setup, or production readiness. The bundled sample remains deterministic and never invokes AI.

## Verification status and remaining limits

### New isolated on-device verification

A newly completed isolated-copy check used the Firebase SDK with `ONLY_ON_DEVICE`, a synthetic image, and synthetic printer-feed-failure text. The page displayed `ON-DEVICE · CHROME` / `Gemini Nano` and produced a work order; the cloud-fallback control remained disabled throughout. This confirms the observed on-device route under those isolated test conditions only. It does not verify access to a real Firebase project, production App Check attestation or enforcement, cloud fallback, billing, or production readiness.

### Historical isolated-copy context

An earlier `ON_DEVICE` observation came from an isolated copy based around historical commit `8ba98a3`, not from the then-current working-tree revision. It is retained only as historical context. Do not merge that older observation with the newly completed check or generalize either result beyond the stated isolated conditions.

### Historical bounded cloud verification

A previous isolated `ONLY_IN_CLOUD` request **succeeded** in a test page using a temporary App Check debug provider and synthetic inputs. The request returned a model response in that bounded test. The temporary debug-provider setup has since been revoked. This result confirms only that one explicitly authorized cloud request completed under those isolated conditions; it is not evidence that this application's `PREFER_ON_DEVICE` route automatically falls back to cloud, and it is not evidence of production App Check attestation, enforcement, security rules, billing readiness, or production availability. No cloud request is being initiated for this review.

The isolated results above do not establish automatic cloud fallback or production readiness. Any future live check requires explicit case-specific consent, an authorized project, an appropriate production App Check setup, and a separate review of cost controls. Never place project identifiers, tokens, or debug values in source control, screenshots, deployment artifacts, or public documentation.

## Safety and technical limits

- On-device inference is a single turn of text or text plus JPEG/PNG, not a multi-turn chat. See the [hybrid Web guide](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started).
- The local hazard guard is a plain keyword/sentence check, not a complete safety classifier. Its negative-phrase handling is intentionally conservative but can miss paraphrases or stop unnecessarily.
- The model may misread an image or return incomplete JSON. Output is bounded, validated, and never treated as a repair diagnosis.
- The app handles office-printer first response only. It does not recommend opening panels, touching wiring, defeating interlocks, or reaching inside machinery.
- The tests above do not establish production App Check, automatic `PREFER_ON_DEVICE` cloud fallback, or general availability of any Firebase project.

## Project structure

```text
src/domain.ts             Local hazard guard, work-order schema, output filtering
src/firebase-ai.ts        Firebase AI Logic Web hybrid route and JSON schema
src/runtime-mode.ts       Fictional local-demo config and fail-closed route policy
src/main.ts               Single-page UI, explicit consent and in-memory case flow
src/sample.ts             Original SVG illustration and labelled non-AI fixture
src/domain.test.ts        Safety and normalisation unit tests
src/runtime-mode.test.ts  Local-demo mode and cloud-fallback constraint tests
src/image-sizing.ts       Pure bounded image-resize math
src/image-sizing.test.ts  Tests for image dimensions and resize boundaries
public/sw.js              App-shell service worker; no case-data persistence
.env.example              Non-functional placeholders only
LICENSE                   MIT License
```

## BuildHybridAI 2026 status

This is a prototype prepared for BuildHybridAI 2026. Demonstrations and test results should be understood within the verification boundaries described above; a source repository alone does not establish an official submission.

## License

MIT. Firebase AI Logic SDK and other installed packages retain their own licenses; see their package metadata.
