import { AppSettings } from "./types";
import { DEFAULT_SETTINGS } from "./constants";

/**
 * Returns a version of `AppSettings` where every optional field group has its
 * defaults applied.  Callers can then access settings without the repetitive
 * `settings.foo?.bar ?? defaultValue` pattern.
 *
 * Example:
 *   const s = resolvedSettings(settings);
 *   s.automation.enableSmartUrlTransform   // always boolean, never undefined
 *   s.privacy.neverPersistSensitive        // always boolean, never undefined
 */
export function resolvedSettings(s: AppSettings): ResolvedAppSettings {
    const def = DEFAULT_SETTINGS;

    return {
        ...s,
        automation: {
            trustModeDefault: "balanced",
            appTrustModes: [],
            enableUniversalFallback: true,
            enablePastePreview: true,
            previewHoldMs: 250,
            enableCommandPalette: true,
            enableIntentFieldDetection: true,
            enableSmartUrlTransform: true,
            enableLocaleAwareness: true,
            enableHealthGuard: true,
            enableAutoLearning: true,
            enableRecipes: true,
            enableUndo: true,
            sessionClusterMinutes: 20,
            ...s.automation,
        },
        privacy: {
            enableEphemeralSensitiveClips: true,
            sensitiveTtlSeconds: 90,
            sensitiveAllowlistApps: [],
            enablePrivacyFirewall: true,
            firewallRedactionMode: "display_only",
            autoMutateOnPublicApps: false,
            mutateClipboardApps: [],
            neverPersistSensitive: true,
            ...s.privacy,
        },
        diagnostics: {
            observabilityEnabled: false, // default OFF — user must opt-in
            maxEvents: def.diagnostics?.maxEvents ?? 500,
            telemetryDeviceId: "",
            ...s.diagnostics,
        },
        autoLearnedRules: s.autoLearnedRules ?? [],
        recipes: s.recipes ?? [],
    };
}

/**
 * The fully-resolved variant of AppSettings where all optional groups
 * are guaranteed to be defined.
 */
export type ResolvedAppSettings = Omit<
    AppSettings,
    "automation" | "privacy" | "diagnostics" | "autoLearnedRules" | "recipes"
> & {
    automation: Omit<Required<NonNullable<AppSettings["automation"]>>, "paletteFavorites"> & {
        paletteFavorites?: NonNullable<AppSettings["automation"]>["paletteFavorites"];
    };
    privacy: Required<NonNullable<AppSettings["privacy"]>>;
    diagnostics: Required<NonNullable<AppSettings["diagnostics"]>>;
    autoLearnedRules: NonNullable<AppSettings["autoLearnedRules"]>;
    recipes: NonNullable<AppSettings["recipes"]>;
};
