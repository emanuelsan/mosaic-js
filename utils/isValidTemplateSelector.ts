import { Effect, Schema } from "effect";


// export type TemplateSelectorType = 'relative' | 'root' | 'id';
const TemplateSelectorTypeSchema = Schema.Literal('relative', 'root', 'id');
type TemplateSelectorType = typeof TemplateSelectorTypeSchema.Type;

const SelectorValidationSchema = Schema.Union(
  Schema.Struct({
    valid: Schema.Literal(true),
    type: TemplateSelectorTypeSchema,
  }),
  Schema.Struct({
    valid: Schema.Literal(false),
  })
);

type SelectorValidation = typeof SelectorValidationSchema.Type;

/**
 * Effectful function that validates a MosaicJS template selector string and determines its type.
 * Accepts a selector and returns an Effect that, when executed, yields an object indicating whether the selector is valid,
 * and if valid, specifies its type ('relative', 'root', or 'id').
 *
 * Supported selector formats:
 * - Relative path (e.g., 'some-dir/core-instructions')
 * - Root path prefixed with '@' (e.g., '@root-block', '@namespace/path')
 * - ID selector prefixed with '#' (e.g., '#some-id')
 *
 * Returns: Effect<SelectorValidation>
 */
export const isValidTemplateSelector = (
  selector: string
): Effect.Effect<SelectorValidation> =>
  Effect.sync(() => {
    // Type 1: relative path (no prefix)
    const relativePath = /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/;
    // Type 2: root path (starts with @)
    const rootPath = /^@[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/;
    // Type 3: id selector (starts with #)
    const idSelector = /^#[a-zA-Z0-9_-]+$/;

    if (relativePath.test(selector)) return { valid: true, type: 'relative' };
    if (rootPath.test(selector)) return { valid: true, type: 'root' };
    if (idSelector.test(selector)) return { valid: true, type: 'id' };

    return { valid: false };
  });