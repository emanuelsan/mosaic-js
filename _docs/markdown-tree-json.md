# Template Tree Architecture

Mosaic builds a hierarchical tree structure to manage template dependencies, detect circular references, and enable recursive content expansion. This document explains how the `TemplateTreeNode` structure works and the expansion process.

## TemplateTreeNode Structure

Each node in the template tree implements the `TemplateTreeNode` interface:

```typescript
interface TemplateTreeNode extends ParsedMarkdownTemplate {
  path: string;           // Normalized relative path (e.g., "agents/wiley-coyote")
  ancestors: string[];    // Array of ancestor paths for loop detection
  children?: TemplateTreeNode[]; // Child nodes populated during expansion
}

interface ParsedMarkdownTemplate {
  path: string;           // Template identifier
  frontmatter: Record<string, any> | null; // YAML frontmatter data
  content: string;        // Markdown content with references
  variables: string[];    // Variable names found in content (without $ prefix)
  references: string[];   // Template references found in content
}
```

## Sample Tree Structure

Here's an example of a fully built tree for `agents/wiley-coyote`:

```json
{
  "path": "agents/wiley-coyote",
  "ancestors": [],
  "frontmatter": null,
  "content": "You are Wiley Coyote...\n\n# Company Info\n{{ company-info/description }}\n\n# Rules\n{{ #special-rules }}",
  "variables": ["numberOfAttempts"],
  "references": ["company-info/description", "general/rules/special-rules"],
  "children": [
    {
      "path": "company-info/description",
      "ancestors": ["agents/wiley-coyote"],
      "frontmatter": null,
      "content": "The company is called ACME...",
      "variables": [],
      "references": [],
      "children": []
    },
    {
      "path": "general/rules/special-rules",
      "ancestors": ["agents/wiley-coyote"],
      "frontmatter": { "id": "special-rules" },
      "content": "These are special rules...\nAttempts: {{ $numberOfAttempts }}",
      "variables": ["numberOfAttempts"],
      "references": [],
      "children": []
    }
  ]
}
```

## Tree Building Process

Mosaic builds the tree through several key functions:

### 1. `buildTemplateTree(rootSelector)`
Main entry point that orchestrates the entire process:
```typescript
export const buildTemplateTree = (rootSelector: string) =>
  pipe(
    getNodeFromSelector(rootSelector),
    Effect.andThen(expandAndFlattenRecursively)
  );
```

### 2. `getNodeFromSelector(selector, ancestors)`
Creates a `TemplateTreeNode` from a selector:
- **Validates selector format** (relative, ID `#`, or root `@`)
- **Checks file existence** in the template directory
- **Normalizes path** to relative format regardless of selector type
- **Parses markdown content** to extract frontmatter, variables, and references
- **Filters circular references** using ancestor chain
- **Returns sanitized node** with loop-free references

### 3. `expandAndFlattenRecursively(node)`
Recursively expands the tree until no references remain:
```typescript
const expandAndFlattenRecursively = (node: TemplateTreeNode) =>
  Effect.gen(function* () {
    let currentNode = node;
    
    // Loop while there are still references to expand
    while (currentNode.references && currentNode.references.length > 0) {
      // Step 1: Attach children for current references
      const nodeWithChildren = yield* attachChildren(currentNode);
      
      // Step 2: Flatten children content into parent
      currentNode = yield* flattenChildrenAndExpandContent(nodeWithChildren);
    }
    
    return currentNode;
  });
```

### 4. `attachChildren(rootNode)`
Populates the `children` array by resolving references:
- **Creates child nodes** for each reference in `rootNode.references`
- **Expands each child's content** with its own path-specific variables
- **Passes ancestor chain** to prevent loops (`[...rootNode.ancestors, rootNode.path]`)
- **Returns node** with populated `children` array

### 5. `flattenChildrenAndExpandContent(rootNode)`
Flattens children into parent content:
- **Creates mustache context** from children: `{ "child-path": "child-content" }`
- **Expands parent content** using mustache templating
- **Extracts new references** from expanded content
- **Clears children array** after flattening
- **Returns flattened node** ready for next iteration

## Loop Detection and Safety

Mosaic implements multiple layers of loop protection:

### Self-Reference Detection
```typescript
if (filteredNode.references.includes(currentPath)) {
  yield* Console.warn(`[LoopDetectedError] Self-reference detected at ${currentPath}`);
  // Remove self-reference and continue
}
```

### Ancestor Loop Detection
```typescript
if (ancestors.includes(normalizedRef)) {
  yield* Console.warn(`[LoopDetectedError] Ancestor loop detected: ${normalizedRef}`);
  // Remove looped reference and continue
}
```

### Duplicate Reference Elimination
References are automatically deduplicated during extraction to prevent processing the same template multiple times.

## Variable Expansion

Variables are expanded at the child level before flattening:

1. **Each child's content** is expanded with its own path-specific variables
2. **Path-specific overrides** take precedence over global variables
3. **Missing variables** are replaced with empty strings
4. **Expanded children** are then flattened into parent content

This ensures correct variable precedence and prevents conflicts between different templates.

## Reference Normalization

All reference types are normalized to relative paths:
- **Relative**: `company-info/description` → `company-info/description`
- **ID**: `#special-rules` → `general/rules/special-rules` (found by frontmatter ID)
- **Root**: `@shared/footer` → `shared/footer` (relative to template root)

## Final Output

The process continues until the root node has:
- **Empty references array** (all references resolved)
- **Fully expanded content** (all variables and templates integrated)
- **No children** (all flattened into content)

The final `node.content` contains the complete, composed template ready for use.