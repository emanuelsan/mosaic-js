import path from "path";
import fs from "fs";
import pc from "picocolors";
import { Effect } from "effect";

import { findMarkdownFileById } from "./findMarkdownFileById";

// Types
import { TemplateSelectorType } from "../types/TemplateSelectorType";
import { Directory } from "./normalizeToRelativeSelector";

export interface GetTemplateContentParams {
  instructionsDir: string;
  templateSelector: string;
  type: TemplateSelectorType;
}

/**
 * Gets the template content based on selector type. Returns file content or null if not found.
 */
export function getTemplateContentLEGACY({
  instructionsDir,
  templateSelector,
  type,
}: GetTemplateContentParams): string | null {
  if (type === "id") {
    const id = templateSelector.slice(1); // remove '#'
    const foundPath = findMarkdownFileById(instructionsDir, id);
    if (!foundPath) {
      console.log(
        pc.red(`${templateSelector} does not exist. Returning null.`),
      );
      return null;
    }
    console.log(
      pc.green(`getTemplateContentLEGACY: ${templateSelector} exists`),
    );
    return fs.readFileSync(foundPath, "utf-8");
  }

  let selectorPath = templateSelector;
  if (type === "root") {
    selectorPath = templateSelector.slice(1);
  }

  const templatePath = path.join(instructionsDir, selectorPath + ".md");
  if (!fs.existsSync(templatePath)) {
    console.log(pc.red(`${templateSelector} does not exist. Returning null.`));
    return null;
  }

  console.log(pc.green(`getTemplateContentLEGACY: ${templateSelector} exists`));
  return fs.readFileSync(templatePath, "utf-8");
}

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
        console.log(
          pc.red(`${templateSelector} does not exist. Returning null.`),
        );
        return null;
      }
      console.log(pc.green(`getTemplateContent: ${templateSelector} exists`));
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
      console.log(
        pc.red(`${templateSelector} does not exist. Returning null.`),
      );
      return null;
    }

    console.log(pc.green(`getTemplateContent: ${templateSelector} exists`));
    return fs.readFileSync(templatePath, "utf-8");
  });
