import { Effect, Console, Data, Context } from 'effect';

import { isValidTemplateSelector } from './utils/isValidTemplateSelector';
import { buildTemplateTree } from './utils/buildTemplateTree';
import { checkDirectory } from './utils/checkDirectory';

import {
  type TemplateVariables,
  decodeVariables,
} from './utils/decodeVariables';
import {
  type TemplateOverrides,
  decodeTemplateOverrides,
} from './utils/decodeTemplateOverrides';
import { Directory } from './utils/normalizeToRelativeSelector';

// Error Types Definitions
class InvalidTemplateSelectorError extends Data.TaggedError(
  'InvalidTemplateSelectorError'
)<{
  message: string;
}> {}


export class MosaicVariables extends Context.Tag('MosaicVariables')<
  MosaicVariables,
{
  readonly templateVariables: Effect.Effect<TemplateVariables>;
  readonly templateOverrides: Effect.Effect<TemplateOverrides>;
}>() {}


// Class Definitions
export class Mosaic {
  private instructionsDir: string;
  private variables: TemplateVariables = {};
  private overrides: TemplateOverrides = {};

  /**
   * Creates a new Mosaic instance.
   * @param instructionsDir - Path to the directory containing all the markdown files to be parsed and assembled.
   * This directory should contain the modular instruction templates for expansion.
   */
  constructor(instructionsDir: string) {
    this.instructionsDir = instructionsDir;
  }

  compose(templateSelector: string): string {
    // Create the full Effect context
    const context = Context.empty().pipe(
      Context.add(MosaicVariables, {
        templateVariables: Effect.succeed(this.variables),
        templateOverrides: Effect.succeed(this.overrides),
      }),
      Context.add(Directory, {
        templateDir: Effect.succeed(this.instructionsDir),
      })
    );

    // Define the full expansion pipeline
    const pipeline = Effect.gen(function* () {
      const validation = yield* isValidTemplateSelector(templateSelector);
      if (!validation.valid) {
        yield* Console.error(
          `${templateSelector} is not a valid template selector. Returning empty string.`
        );
        return yield* Effect.fail(
          new InvalidTemplateSelectorError({
            message: 'Invalid template selector',
          })
        );
      }

      // Build the template tree, recursively expand and flatten it
      const finalNode = yield* buildTemplateTree(templateSelector);
      return finalNode.content;
    });

    // Provide context and run the pipeline
    const result = Effect.runSync(
      Effect.provide(pipeline, context)
    );

    return result;
  }

  /**
   * Creates a new Mosaic instance from a directory of markdown files.
   * @param instructionsDir - Path to the directory that this mosaic will have as a parse base.
   */
  static fromDirectory(instructionsDir: string): Mosaic {
    return Effect.runSync(checkDirectory(instructionsDir));
  }

  provideVariables(variables: TemplateVariables): Mosaic {
    const decoded = Effect.runSync(decodeVariables(variables));
    this.variables = {
      ...this.variables,
      ...decoded,
    };
    return this;
  }

  provideOverrides(overrides: TemplateOverrides): Mosaic {
    const effect = Effect.provideService(
      decodeTemplateOverrides(overrides),
      Directory,
      { templateDir: Effect.succeed(this.instructionsDir) }
    );
    const decoded = Effect.runSync(effect);
    this.overrides = {
      ...this.overrides,
      ...decoded,
    };
    return this;
  }
}
