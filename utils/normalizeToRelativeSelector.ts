import path from 'path';
import { findMarkdownFileById } from './findMarkdownFileById';
import { Effect, Context, Schema } from 'effect';


// Context
export class Directory extends Context.Tag('Directory')<
  Directory,
  {
    readonly templateDir: Effect.Effect<string>;
  }
>() {}

// export type TemplateSelectorType = 'relative' | 'root' | 'id';
const TemplateSelectorTypeSchema = Schema.Literal('relative', 'root', 'id');
type TemplateSelectorType = typeof TemplateSelectorTypeSchema.Type;

export type TemplateSelectorValidation = {
  valid: boolean;
  type?: TemplateSelectorType;
};

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

  /**
 * Effectful function that normalizes a validated MosaicJS template selector to a relative path string.
 * 
 * This is an unsafe function: it expects the provided selector to be already validated and of a correct type.
 * The function uses the selector type to determine how to normalize:
 * - For 'id' selectors (e.g., '#some-id'), it resolves the corresponding markdown file and returns the path relative to the template directory.
 * - For 'root' selectors (e.g., '@root-block'), it removes the '@' prefix and returns the path as relative to root.
 * - For 'relative' selectors, it returns the selector as-is.
 * 
 * Context: Requires access to the template directory from the Directory context.
 * Returns: Effect<string | null>
 */
export const normalizeSelector = (
  selector: string,
  type: TemplateSelectorType
) =>
  Effect.gen(function* () {
    // Get the template directory from the context
    const directory = yield* Directory;
    const templateDir = yield* directory.templateDir;

    if (type === 'id') {
      const id = selector.slice(1); // remove '#'
      const foundPath = yield* Effect.sync(() => findMarkdownFileById(templateDir, id));
      
      if (!foundPath) return null;
      // Return the path relative to the templateDir, without extension
      const relativePath = path
        .relative(templateDir, foundPath)
        .replace(/\\/g, '/');
      return relativePath.replace(/\.md$/, '');
    }
    if (type === 'root') {
      // Remove '@' prefix, return as relative to root
      return selector.slice(1);
    }

    // Already relative, just return as-is
    return selector;
  });

export const normalizeToRelativeSelector = (selector: string) =>
  Effect.gen(function* () {
    const validation = yield* isValidTemplateSelector(selector);

    return validation.valid ? yield* normalizeSelector(selector, validation.type) : null;
  });
