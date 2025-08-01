import { Effect, Schema, Either, Data } from 'effect';

import { TemplateVariablesSchema } from './decodeVariables';
import { normalizeOverridesPaths } from './normalizeOverridesPaths';

// Schema Definitions
const TemplateOverridesSchema = Schema.Record({
  key: Schema.String,
  value: TemplateVariablesSchema,
});

// Type Definitions
export type TemplateOverrides = typeof TemplateOverridesSchema.Type;

// Error Definitions
class VariablesDecodeError extends Data.TaggedError('VariablesDecodeError')<{
  message: string;
}> {}

export const decodeTemplateOverrides = (overrides: TemplateOverrides) =>
  Effect.gen(function* () {
    const decoded = Schema.decodeUnknownEither(TemplateOverridesSchema)(
      overrides
    );

    if (Either.isLeft(decoded)) {
      return yield* Effect.fail(
        new VariablesDecodeError({
          message: 'Template overrides are not valid format.',
        })
      );
    }

    const normalizedOverrides = yield* normalizeOverridesPaths(decoded.right);

    return normalizedOverrides;
  });
