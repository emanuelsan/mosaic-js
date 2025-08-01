import { Effect } from "effect";

import { normalizeToRelativeSelector } from "./normalizeToRelativeSelector";

import { type TemplateVariables } from "./decodeVariables";
import { type TemplateOverrides } from "./decodeTemplateOverrides";

/**
 * Takes a TemplateOverrides object (mapping selectors to variables) and normalizes all selector keys
 * to their canonical relative path format, resolving id and root selectors as needed.
 * Returns an Effect that yields a new TemplateOverrides object with normalized keys.
 */
export const normalizeOverridesPaths = (
    overrides: TemplateOverrides,
) => Effect.forEach(
    Object.entries(overrides),
    ([key, value]) => normalizeToRelativeSelector(key)
        .pipe(
            Effect.map(normalizedKey =>
                normalizedKey ? [normalizedKey, value] : undefined
            )
        ),
    { concurrency: 'unbounded' }
).pipe(
    Effect.map(results =>
        Object.fromEntries(results.filter((entry): entry is [string, TemplateVariables] => !!entry))
    )
)