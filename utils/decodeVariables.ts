import { Data, Effect, Either, Schema } from 'effect';

// Schema Definitions
export const TemplateVariablesSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Union(Schema.String, Schema.Number),
});

// Type Definitions
export type TemplateVariables = typeof TemplateVariablesSchema.Type;

// Error Definitions
class VariablesDecodeError extends Data.TaggedError('VariablesDecodeError')<{
  message: string;
}> {}

export const decodeVariables = (variables: TemplateVariables) =>
  Effect.gen(function* () {
    const decoded = Schema.decodeUnknownEither(TemplateVariablesSchema)(
      variables
    );

    if (Either.isLeft(decoded)) {
      return yield* Effect.fail(
        new VariablesDecodeError({
          message: 'Template variables are not valid.',
        })
      );
    }

    return decoded.right;
  });
