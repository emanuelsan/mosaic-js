import path from 'path';
import fs from 'fs';
import { Effect, Data } from 'effect';
import { Mosaic } from '../Mosaic';

// Error Types
class DirectoryNotFoundError extends Data.TaggedError('DirectoryNotFoundError')<{ message: string }> {}
class ItemNotADirectoryError extends Data.TaggedError('ItemNotADirectoryError')<{ message: string }> {}

// Function
export const checkDirectory = (instructionsDir: string) =>
    Effect.gen(function* () {
        const absInstructionsDir = path.resolve(process.cwd(), instructionsDir);

        // Check if the directory exists
        if (!fs.existsSync(absInstructionsDir)) {
            return yield* Effect.fail(new DirectoryNotFoundError({ message: `Directory does not exist: ${absInstructionsDir}` }));
        }

        // Check if the item is an actual directory
        if (!fs.statSync(absInstructionsDir).isDirectory()) {
            return yield* Effect.fail(new ItemNotADirectoryError({ message: `Item is not a directory: ${absInstructionsDir}` }));
        }

        return new Mosaic(instructionsDir);
    });
