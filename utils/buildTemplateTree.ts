// Module Imports
import Mustache from 'mustache';
import { Effect, Console, pipe, Data, Context, Option } from 'effect';

// Util Imports
import { parseMarkdown, extractReferencesFromContent } from './parseMarkdownTemplate';
import { ParsedMarkdownTemplate } from './parseMarkdownTemplate';

// Context Imports
import { MosaicVariables } from '../Mosaic';
import type { TemplateVariables } from '../utils/decodeVariables';
import type { TemplateOverrides } from '../utils/decodeTemplateOverrides';
import { normalizeOverridesPaths } from '../utils/normalizeOverridesPaths';

/**
 * Represents a node in the template tree structure.
 * Extends ParsedMarkdownTemplate with additional properties for tree traversal and loop detection.
 * 
 * @interface TemplateTreeNode
 * @extends ParsedMarkdownTemplate
 * @property {string} path - The relative path identifier for this template node
 * @property {string[]} ancestors - Array of ancestor paths used for loop detection during traversal
 * @property {TemplateTreeNode[]} [children] - Optional array of child nodes that this template references
 */
interface TemplateTreeNode extends ParsedMarkdownTemplate {
  path: string;
  ancestors: string[];
  children?: TemplateTreeNode[];
}

/**
 * Error class for detecting and handling circular reference loops in template expansion.
 * Used when a template references itself directly or indirectly through ancestor chains.
 * 
 * @class LoopDetectedError
 * @extends Data.TaggedError
 * @property {string} path - The path where the loop was detected
 * @property {string} message - Descriptive error message about the loop
 */
class LoopDetectedError extends Data.TaggedError('LoopDetectedError')<{
  path: string;
  message: string;
}> {}

/**
 * Removes specified references from a template node's references array and content.
 * This function filters out unwanted references and removes their corresponding mustache syntax from the content.
 * 
 * @param {TemplateTreeNode} templateNode - The template node to process
 * @param {string[]} referencesToRemove - Array of reference paths to remove from the node
 * @returns {TemplateTreeNode} A new template node with the specified references removed from both the references array and content
 */
const removeReferenceFromNode = (
  templateNode: TemplateTreeNode,
  referencesToRemove: string[]
) => {
  /**
   * Utility function to escape regex special characters in a string.
   * @param {string} str - The string to escape
   * @returns {string} The escaped string safe for use in regex patterns
   */
  const escapeRegExp = (str: string) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const newReferences = templateNode.references.filter(
    (ref) => !referencesToRemove.includes(ref)
  );
  let newContent = templateNode.content;
  for (const refToRemove of referencesToRemove) {
    // Remove all occurrences of {{ ...refToRemove... }} with arbitrary whitespace
    const regex = new RegExp(`{{\\s*${escapeRegExp(refToRemove)}\\s*}}`, 'g');
    newContent = newContent.replace(regex, '');
  }
  return { ...templateNode, references: newReferences, content: newContent };
};

/**
 * Filters out circular references from a template node to prevent infinite loops during expansion.
 * Detects and removes both self-references and ancestor loops, logging warnings for each removal.
 * 
 * @param {TemplateTreeNode} templateNode - The template node to check for circular references
 * @returns {Effect.Effect<TemplateTreeNode>} An Effect that yields a template node with all circular references removed
 */
const filterLoopedReferences = (templateNode: TemplateTreeNode) =>
  Effect.gen(function* () {
    const ancestors = templateNode.ancestors;
    const currentPath = templateNode.path;

    // Remove self-references if present
    // Behavior: If a template reference is discovered to be a self-reference, or a loop in the ancestors
    // it is removed from the content of the node and a warning is logged.
    let filteredNode = templateNode;
    if (filteredNode.references.includes(currentPath)) {
      yield* Console.warn(
        `[LoopDetectedError] Self-reference detected in references at ${currentPath}`
      );
      yield* Console.warn(`Removing self-reference...`);
      filteredNode = removeReferenceFromNode(filteredNode, [currentPath]);
    }

    // Check for ancestor loops and remove any references that would create cycles
    const loopedReferences = filteredNode.references.filter((ref) =>
      ancestors.includes(ref)
    );
    if (loopedReferences.length > 0) {
      yield* Console.warn(
        `[LoopDetectedError] Loop detected in template! at ${currentPath} with references: ${loopedReferences.join(
          ', '
        )}`
      );
      yield* Console.warn(`Removing looped references...`);
      filteredNode = removeReferenceFromNode(filteredNode, loopedReferences);
    }

    return filteredNode;
  });

/**
 * Processes a template selector and a list of ancestor selectors to generate a sanitized TemplateTreeNode.
 *
 * This function takes a root selector (the identifier for a template node) and an optional list of ancestor selectors.
 * It parses the template, then applies loop detection and cleanup logic using the provided ancestors list.
 * Any self-references or ancestor loops in the node's `references` array are detected and removed,
 * ensuring the returned node is free from circular references. Warnings are logged for any loops that are found and removed.
 * Note: The ancestors list is used only for loop detection and is not attached to the returned node.
 *
 * @param {string} rootSelector - The selector identifying the root template node to process.
 * @param {string[]} [ancestors=[]] - An array of ancestor selectors representing the traversal path to this node (used for loop detection only).
 * @returns {Effect.Effect<TemplateTreeNode>} An Effect that yields a TemplateTreeNode with all reference and ancestor loops removed.
 */
export const getNodeFromSelector = (
  rootSelector: string,
  ancestors: string[] = []
) =>
  pipe(
    parseMarkdown(rootSelector),
    Effect.map((templateNode) => ({ ...templateNode, ancestors })),
    Effect.flatMap(filterLoopedReferences)
  );

/**
 * Attaches child nodes to a parent template node by resolving all its references.
 * Creates child TemplateTreeNode instances for each reference in the parent node,
 * passing the current ancestor chain for loop detection.
 * Each child's content is expanded with its own path-specific variables before attachment.
 * 
 * @param {TemplateTreeNode} rootNode - The parent node to attach children to
 * @returns {Effect.Effect<TemplateTreeNode>} An Effect that yields the parent node with populated children array
 */
const attachChildren = (rootNode: TemplateTreeNode) =>
  Effect.gen(function* () {
    const references = rootNode.references;
    const children = yield* Effect.forEach(references, (ref) =>
      Effect.gen(function* () {
        // Get the child node
        const childNode = yield* getNodeFromSelector(ref, [...rootNode.ancestors, rootNode.path]);
        
        // Expand the child's content with its own path-specific variables
        const childTemplateVariables = yield* extractTemplateVariables(childNode.path);
        const expandedContent = yield* Effect.sync(() =>
          Mustache.render(childNode.content, childTemplateVariables)
        );
        
        // Return child with expanded content
        return { ...childNode, content: expandedContent };
      })
    );
    return { ...rootNode, children };
  });

/**
 * Expands and flattens a template node until no more references remain using Effect.loop.
 * This function loops through: expand children → flatten content → repeat until done.
 *
 * @param node - The template node to process
 * @returns Effect that yields the fully expanded and flattened node
 */
const expandAndFlattenRecursively = (node: TemplateTreeNode) =>
  Effect.gen(function* () {
    let currentNode = node;

    // Loop while there are still references to expand
    while (currentNode.references && currentNode.references.length > 0) {
      // Step 1: Expand children for current references
      const nodeWithChildren = yield* attachChildren(currentNode);

      // Step 2: Flatten children content into parent
      currentNode = yield* flattenChildrenAndExpandContent(nodeWithChildren);
    }

    return currentNode;
  });



/**
 * Extracts template variables from the MosaicVariables context and merges them with any overrides.
 * Returns a combined variables object that can be used for mustache templating.
 * Variable names are prefixed with '$' to match the template syntax (e.g., 'numberOfAttempts' becomes '$numberOfAttempts').
 * 
 * Path-specific overrides take precedence over global variables when the currentPath matches a normalized override key.
 *
 * @param currentPath - The current template path to check for overrides
 * @returns Effect that yields the merged template variables with $ prefixes
 */
const extractTemplateVariables = (currentPath: string) =>
  Effect.gen(function* () {
    // Try to get MosaicVariables from context, but don't fail if not provided
    const mosaicVariables = yield* Effect.serviceOption(MosaicVariables);
    
    return Option.isNone(mosaicVariables)
      ? {} // No variables provided, return empty object
      : yield* Effect.gen(function* () {
          const variables = yield* mosaicVariables.value.templateVariables;
          const overrides = yield* mosaicVariables.value.templateOverrides;

          // Normalize override paths from ID/special syntax to relative paths
          // This converts keys like "#special-rules" to "general/rules/special-rules"
          const normalizedOverrides = yield* normalizeOverridesPaths(overrides);
          
          yield* Console.log(`Checking overrides for path: ${currentPath}`);
          yield* Console.log('Normalized overrides:', normalizedOverrides);

          // Check if there are any overrides for the current path
          const pathOverrides = normalizedOverrides[currentPath] || {};
          
          // Merge base variables with path-specific overrides (overrides take precedence)
          const mergedVariables = { ...variables, ...pathOverrides };
          
          // Add $ prefix to variable names to match template syntax
          const prefixedVariables: Record<string, string | number> = {};
          for (const [key, value] of Object.entries(mergedVariables)) {
            prefixedVariables[`$${key}`] = value;
          }
          
          yield* Console.log(`Template variables for ${currentPath}:`);
          yield* Console.log(prefixedVariables);
          
          return prefixedVariables;
        });
  });

/**
 * Expands the content of a parent node using mustache templating with its children's content and template variables.
 * After expansion, children are cleared and new references are extracted from the expanded content.
 * Template variables are extracted per child path to ensure path-specific overrides are applied correctly.
 *
 * @param rootNode - The parent node with children to be expanded
 * @returns Effect that yields the expanded node with new references from expanded content
 */
const flattenChildrenAndExpandContent = (rootNode: TemplateTreeNode) =>
  Effect.gen(function* () {
    const children = rootNode.children ?? [];

    // If no children, return the node as-is
    if (children.length === 0) {
      return rootNode;
    }

    // Create mustache context from children: { "path": "content" }
    const mustacheContext: Record<string, string | number> = {};
    for (const child of children) {
      mustacheContext[child.path] = child.content;
    }

    // Children content is already expanded with their own path-specific variables
    // No need to extract additional template variables here
    const combinedContext = mustacheContext;

    yield* Console.log('The root node content is: ');
    yield* Console.log(rootNode.content);
    yield* Console.log('The combined mustache context is: ');
    yield* Console.log(combinedContext);

    // Expand parent content using mustache with both children content and variables
    const expandedContent = yield* Effect.sync(() =>
      Mustache.render(rootNode.content, combinedContext)
    );

    // Extract and normalize references from the expanded content
    const { references: newReferences, content: finalContent } =
      yield* extractReferencesFromContent(expandedContent, {
        currentPath: rootNode.path,
        ancestors: rootNode.ancestors,
        removeLoopedReferences: true,
      });

    // Return expanded node with cleared children and new references from expanded content
    return {
      ...rootNode,
      content: finalContent,
      references: newReferences,
      children: [], // Clear children after integration
    };
  });

// Programs

/**
 * Builds a complete template tree by recursively expanding and flattening all references.
 * Takes a root selector and returns a fully resolved template node with all content expanded.
 *
 * @param rootSelector - The selector identifying the root template to build
 * @returns Effect that yields a fully expanded TemplateTreeNode with all references resolved
 */
export const buildTemplateTree = (rootSelector: string) =>
  pipe(
    getNodeFromSelector(rootSelector),
    Effect.andThen(expandAndFlattenRecursively)
  );
