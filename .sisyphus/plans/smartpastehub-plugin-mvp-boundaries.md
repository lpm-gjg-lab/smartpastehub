# SmartPasteHub Plugin MVP Security Boundaries

Scope: Phase 4 (builtin-only plugin wiring)

## Allowed in MVP

- Builtin plugins compiled inside repository codebase.
- Text-only hook points:
  - `before-clean`
  - pipeline transform middleware injection
  - `after-clean`
- Plugin-local key/value storage through in-memory runtime storage.

## Explicitly Blocked in MVP

- Third-party plugin loading from disk/network.
- Arbitrary code loading at runtime.
- Renderer UI/page/settings panel injection.
- Registering new presets/context rules through plugin API runtime.

## Enforcement in Code

- Runtime is builtin-only and registration path is `registerBuiltinPluginRuntime(...)` in `src/plugins/plugin-runtime.ts`.
- Unsupported surfaces throw errors in plugin API implementation:
  - `registerPreset(...)`
  - `registerContextRule(...)`
  - `registerSettingsPanel(...)`
- Plugin activation failures do not get marked as active plugins.

## Verification

- Unit test `tests/plugins/plugin-runtime.test.ts` validates:
  - Hook execution path (`before-clean`, transform, `after-clean`)
  - Unsupported API blocking behavior
  - Builtin plugin end-to-end transform effect
