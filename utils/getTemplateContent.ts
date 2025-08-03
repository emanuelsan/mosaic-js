import path from "path";
import fs from "fs";

import { Effect, Console } from "effect";

import { findMarkdownFileById } from "./findMarkdownFileById";

// Types
import { TemplateSelectorType } from "../types/TemplateSelectorType";
import { Directory } from "./normalizeToRelativeSelector";

// TODO: Write documentation for this function
// This function should respect the principle of graceful degradation
// If a template is not found, it should return null instead of throwing an error
// At the same time, it should log a warning to the console
export const getTemplateContent = ({
  templateSelector,
  type,
}: {
  templateSelector: string;
  type: TemplateSelectorType;
}) =>
  Effect.gen(function* () {
    const directory = yield* Directory;
    const instructionsDir = yield* directory.templateDir;

    // Retrieve content for type id
    if (type === "id") {
      const id = templateSelector.slice(1); // remove '#'
      const foundPath = findMarkdownFileById(instructionsDir, id);
      if (!foundPath) {
        yield* Console.warn(
          `"${templateSelector}" does not exist. Returning null...`,
        );
        return null;
      }
      const templateContent = fs.readFileSync(foundPath, "utf-8");

      return templateContent;
    }

    // Retrieve content for type root
    let selectorPath = templateSelector;
    if (type === "root") {
      selectorPath = templateSelector.slice(1);
    }

    // Retrieve content for type relative
    const templatePath = path.join(instructionsDir, selectorPath + ".md");
    if (!fs.existsSync(templatePath)) {
      yield* Console.warn(
        `"${templateSelector}" does not exist. Returning null...`,
      );
      return null;
    }

    return fs.readFileSync(templatePath, "utf-8");
  });
