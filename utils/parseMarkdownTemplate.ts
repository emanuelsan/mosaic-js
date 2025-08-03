import matter from "gray-matter";
import { Effect, pipe, Console } from "effect";
import { getTemplateContent } from "./getTemplateContent";
import { normalizeToRelativeSelector } from "./normalizeToRelativeSelector";

export interface ParsedMarkdownTemplate {
  path: string;
  frontmatter: Record<string, any> | null;
  content: string;
  variables: string[];
  references: string[];
}

// Step 1: Get the file content
const getContentRelative = (templateSelector: string) =>
  getTemplateContent({ templateSelector, type: "relative" });

// Step 2: Parse frontmatter
const parseFrontmatter = (templateContent: string) =>
  Effect.gen(function* () {
    const parsed = matter(templateContent);
    const frontmatter =
      Object.keys(parsed.data).length > 0 ? parsed.data : null;
    const content = parsed.content;

    return { frontmatter, content };
  });

// Step 3: Extract variables
const extractVariables = ({ content, ...rest }: { content: string }) =>
  Effect.sync(() => {
    const variableRegex = /\{\{\s*\$([a-zA-Z0-9_\-]+)\s*\}\}/g;
    const variables: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = variableRegex.exec(content)) !== null) {
      variables.push(match[1]); // match[1] is variable name without $
    }
    return { ...rest, content, variables };
  });

// Core reference extraction and normalization logic
export const extractReferencesFromContent = (
  content: string,
  options: {
    currentPath?: string;
    ancestors?: string[];
    removeLoopedReferences?: boolean;
    normalizeInContent?: boolean;
  } = {},
) =>
  Effect.gen(function* () {
    const {
      currentPath,
      ancestors = [],
      removeLoopedReferences = false,
      normalizeInContent = false,
    } = options;

    const referenceRegex = /\{\{\s*([^\}]+)\s*\}\}/g;
    let match: RegExpExecArray | null;
    const replacements: { start: number; end: number; replacement: string }[] =
      [];
    const normalizedReferences: string[] = [];
    const referencesToRemove: string[] = [];
    let updatedContent = content;

    // Find and normalize all non-variable references
    while ((match = referenceRegex.exec(content)) !== null) {
      const ref = match[1].trim();
      // Skip variable references (those starting with $)
      if (!/^\$[a-zA-Z0-9_\-]+$/.test(ref)) {
        const normalized = yield* normalizeToRelativeSelector(ref);
        const normalizedRef = normalized ?? ref;

        // Check for self-references and ancestor loops if loop detection is enabled
        if (removeLoopedReferences && currentPath) {
          if (normalizedRef === currentPath) {
            yield* Console.warn(
              `[LoopDetectedError] Self-reference detected in content at ${currentPath}`,
            );
            yield* Console.warn(`Removing self-reference: ${ref}`);
            referencesToRemove.push(ref);
            continue;
          } else if (ancestors.includes(normalizedRef)) {
            yield* Console.warn(
              `[LoopDetectedError] Ancestor loop detected in content at ${currentPath} with reference: ${normalizedRef}`,
            );
            yield* Console.warn(`Removing looped reference: ${ref}`);
            referencesToRemove.push(ref);
            continue;
          }
        }

        normalizedReferences.push(normalizedRef);

        // Add to replacements if we need to normalize in content
        if (normalizeInContent) {
          replacements.push({
            start: match.index,
            end: referenceRegex.lastIndex,
            replacement: `{{ ${normalizedRef} }}`,
          });
        }
      }
    }

    // Remove any self-references or looped references from content
    if (removeLoopedReferences && referencesToRemove.length > 0) {
      const escapeRegExp = (str: string) =>
        str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      for (const refToRemove of referencesToRemove) {
        const regex = new RegExp(
          `\\{\\{\\s*${escapeRegExp(refToRemove)}\\s*\\}\\}`,
          "g",
        );
        updatedContent = updatedContent.replace(regex, "");
      }
    }

    // Replace all references in content with normalized versions (from last to first to not mess up indices)
    if (normalizeInContent && replacements.length > 0) {
      let contentArr = updatedContent.split("");
      for (let i = replacements.length - 1; i >= 0; i--) {
        const { start, end, replacement } = replacements[i];
        contentArr.splice(start, end - start, replacement);
      }
      updatedContent = contentArr.join("");
    }

    return {
      references: [...new Set(normalizedReferences)], // Remove duplicates
      content: updatedContent,
    };
  });

// Step 4: Extract and normalize references
const extractAndNormalizeReferences = ({
  content,
  ...rest
}: {
  content: string;
}) =>
  Effect.gen(function* () {
    const { references, content: newContent } =
      yield* extractReferencesFromContent(content, {
        normalizeInContent: true,
      });

    return {
      ...rest,
      content: newContent,
      references,
    } as ParsedMarkdownTemplate;
  });

// Main Exportable Program
export const parseMarkdown = (templateSelector: string) =>
  pipe(
    getContentRelative(templateSelector),
    Effect.flatMap((content) =>
      Effect.if(content !== null, {
        onTrue: () =>
          pipe(
            Effect.succeed(content as string), // Type assertion since we know content is not null; This might be solved by using branded types (unsure)
            Effect.flatMap(parseFrontmatter),
            Effect.flatMap(extractVariables),
            Effect.flatMap(extractAndNormalizeReferences),
            Effect.map((templateNode) => ({ ...templateNode, path: templateSelector })),
          ),
        onFalse: () =>
          Effect.succeed({
            path: templateSelector,
            frontmatter: null,
            content: '',
            variables: [],
            references: [],
          }),
      })
    )
  );
