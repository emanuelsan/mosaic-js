<div align="center">

# Mosaic.js

<img src="assets/mosaic-logo.png" alt="Mosaic.js Logo" width="150" />

**Composable Markdown-based AI instruction engine for Node.js**

</div>

Mosaic.js is a powerful template composition library that allows you to build complex, hierarchical instruction sets from modular Markdown files. Perfect for AI agents, documentation systems, and any scenario where you need to compose dynamic content from reusable templates.

## Principles of Mosaic

Mosaic was designed with specific principles in mind to make template composition accessible, reliable, and flexible:

### 🛡️ Silent Safety
Mosaic is built to be **silently safe** - it never breaks or throws errors that stop execution. Instead, it gracefully handles edge cases and continues processing:
- **Duplicate references**: Automatically detected and eliminated, processing continues
- **Duplicate IDs**: First occurrence is used, warning displayed, processing continues
- **Circular references**: Detected and removed with warnings, processing continues
- **Self-references**: Identified and filtered out, processing continues
- **Missing variables**: Replaced with empty strings, processing continues

The only requirement is providing a directory with Markdown files - everything else is optional and handled gracefully.

### 👥 Business-User Friendly
Mosaic empowers **non-technical users** to create and compose complex templates without any programming knowledge:
- **No JavaScript required**: Business users can compose templates using simple Markdown syntax
- **Intuitive reference system**: Natural `{{ template-name }}` syntax for linking templates
- **Plain English**: Templates are written in Markdown, readable by anyone
- **Visual structure**: Directory organization mirrors logical template hierarchy

### 🔧 Developer Flexibility
Mosaic provides **optional developer control** while respecting business user autonomy:
- **Variable injection**: Developers can pass dynamic values into business-created templates
- **Path-specific overrides**: Fine-grained control over variable values per template
- **Chainable API**: Flexible variable management with intuitive method chaining
- **Graceful degradation**: Templates work with or without developer-provided variables

### 🎯 Always Tries to Render
Mosaic follows the principle of **best effort composition** - it always attempts to produce meaningful output:
- Missing variables become empty strings rather than errors
- Broken references are removed and logged, not fatal
- Partial templates are better than no templates
- Users get feedback through warnings, not crashes

### 🌐 Framework & Platform Agnostic
Mosaic is designed to be **universally applicable** across different contexts and environments:
- **Framework independent**: Works with any Node.js-compatible framework or standalone applications
- **Domain agnostic**: While built to solve AI orchestration challenges, it's useful for any hierarchical text composition
- **Platform neutral**: Runs in any Node.js environment without external dependencies
- **Context flexible**: Adapts to business domains from documentation to instructions to content generation
- **Pure text assembly**: At its core, it's simply a tool for composing text from modular pieces

These principles make Mosaic ideal for **collaborative workflows** where business teams create content and development teams provide dynamic data, without either side blocking the other.

## Features

- 🧩 **Modular Templates**: Compose complex instructions from simple Markdown files
- 🔗 **Reference System**: Link templates together using intuitive selector syntax
- 🎯 **Variable Injection**: Dynamic content with mustache templating and path-specific overrides
- 🔄 **Recursive Expansion**: Automatically resolves nested references and dependencies
- 🛡️ **Loop Detection**: Built-in protection against circular references
- ⚡ **Effect-based**: Built on the Effect library for robust error handling and composability

## Installation

```bash
npm install mosaic-js
```

## Quick Start

```typescript
import { Mosaic } from 'mosaic-js';

// 1. Create a Mosaic instance from a directory of templates
const instructions = Mosaic.fromDirectory('src/templates');

// 2. Provide global variables
instructions.provideVariables({
  agentName: 'Assistant',
  maxAttempts: 3,
});

// 3. Provide path-specific overrides
instructions.provideOverrides({
  '#special-agent': {
    maxAttempts: 10,  // Override for specific template
  },
});

// 4. Compose the final result
const result = instructions.compose('agents/main-agent');
console.log(result);
```

## Directory Structure

Organize your templates in a hierarchical directory structure:

```
templates/
├── agents/
│   ├── main-agent.md
│   └── specialist.md
├── rules/
│   ├── general-rules.md
│   └── special-rules.md
├── company/
│   └── description.md
└── shared/
    └── footer.md
```

## Template Files

Templates are Markdown files with optional frontmatter and reference slots:

**`agents/main-agent.md`**
```markdown
---
id: main-agent
---

# AI Agent Instructions

You are {{ $agentName }}, an AI assistant.

## Company Information
{{ company/description }}

## Rules
{{ rules/general-rules }}
{{ #special-rules }}

## Attempts
You have {{ $maxAttempts }} attempts to complete tasks.
```

**`rules/special-rules.md`**
```markdown
---
id: special-rules
---

These are special operational rules:

- Always be helpful and accurate
- You have {{ $maxAttempts }} attempts maximum
- Follow all safety guidelines
```

**`company/description.md`**
```markdown
We are ACME Corp, a leading technology company specializing in AI solutions.
Our mission is to {{ $companyMission }}.
```

## Reference Syntax

Mosaic supports three types of template selectors, each with different resolution behavior:

### 1. Relative Path Selectors
```markdown
{{ agents/specialist }}
{{ rules/general-rules }}
```

**How it works**: Relative path selectors resolve paths relative to the **current template's location**. If you're in `company/policies/main.md` and reference `{{ shared/footer }}`, Mosaic will look for `company/policies/shared/footer.md`. This allows for contextual, hierarchical organization where templates can reference nearby files naturally.

**Example**:
- Current file: `agents/main-agent.md`
- Reference: `{{ specialist }}`
- Resolves to: `agents/specialist.md`

### 2. ID Selectors (using frontmatter id)
```markdown
{{ #special-rules }}
{{ #main-agent }}
```

**How it works**: ID selectors use the `id` field from a template's frontmatter to locate files anywhere in the directory tree. Mosaic searches the entire template directory for any `.md` file with a matching `id` in its frontmatter, regardless of its location. This provides location-independent referencing.

**Duplicate ID Handling**: If multiple files have the same `id` in their frontmatter (which is a configuration mistake), Mosaic will use the first file it encounters during the search and display a warning in the console about the duplicate IDs. It's recommended to keep IDs unique across your template directory.

**Example**:
- Reference: `{{ #special-rules }}`
- Searches for any file with `id: special-rules` in frontmatter
- Could resolve to: `rules/advanced/special-rules.md` or `policies/special-rules.md`
- Location doesn't matter, only the ID match

### 3. Root Selectors
```markdown
{{ @shared/footer }}
{{ @company/description }}
```

**How it works**: Root selectors always resolve paths relative to the **root directory** where Mosaic was instantiated, regardless of the current template's location. The `@` prefix indicates "start from the root directory". This provides absolute path referencing within your template hierarchy.

**Example**:
- Mosaic created with: `Mosaic.fromDirectory('templates')`
- Reference: `{{ @shared/footer }}` (from any template)
- Always resolves to: `templates/shared/footer.md`
- Current template location is irrelevant

## Variable System

### Global Variables

Provide variables that are available throughout all templates:

```typescript
instructions.provideVariables({
  agentName: 'Claude',
  companyMission: 'democratize AI technology',
  maxAttempts: 5,
});
```

### Chainable Variables

Later calls override earlier ones for the same variable:

```typescript
instructions
  .provideVariables({
    agentName: 'Assistant',
    maxAttempts: 3,
  })
  .provideVariables({
    agentName: 'Claude',  // Overrides 'Assistant'
    specialMode: true,
  });
```

### Path-Specific Overrides

Override global variables for specific templates:

```typescript
instructions.provideOverrides({
  '#special-rules': {
    maxAttempts: 10,      // Only for special-rules template
  },
  'agents/specialist': {
    agentName: 'Expert',  // Only for specialist template
  },
  '@company/description': {
    companyMission: 'lead innovation',  // Only for description template
  },
});
```

## Template Variables

Use mustache syntax with `$` prefix in your templates:

```markdown
Hello {{ $userName }}!

You have {{ $attemptsRemaining }} attempts left.

{{ $customInstructions }}
```

## How It Works

1. **Template Discovery**: Mosaic scans your directory and indexes all `.md` files
2. **Reference Parsing**: Extracts `{{ selector }}` references from template content
3. **Dependency Resolution**: Builds a dependency tree of template relationships
4. **Variable Expansion**: Expands variables using path-specific overrides and global fallbacks
5. **Recursive Composition**: Recursively resolves all references until no more remain
6. **Loop Detection**: Prevents infinite loops from circular references
7. **Final Assembly**: Returns the fully composed content as a string

## API Reference

### `Mosaic.fromDirectory(path: string)`

Creates a new Mosaic instance from a directory of templates.

### `.provideVariables(variables: TemplateVariables)`

Provides global variables available to all templates. Chainable.

### `.provideOverrides(overrides: TemplateOverrides)`

Provides path-specific variable overrides. Chainable.

### `.compose(selector: string)`

Composes the final template from the given root selector.

## TypeScript Support

Mosaic is written in TypeScript and provides full type definitions:

```typescript
import { Mosaic, TemplateVariables, TemplateOverrides } from 'mosaic-js';

const variables: TemplateVariables = {
  name: 'Claude',
  attempts: 5,
};

const overrides: TemplateOverrides = {
  '#special': {
    attempts: 10,
  },
};
```

## Examples

### AI Agent Instructions

```typescript
const agent = Mosaic.fromDirectory('agent-templates');

agent
  .provideVariables({
    agentName: 'Claude',
    personality: 'helpful and accurate',
    maxTokens: 4000,
  })
  .provideOverrides({
    '#creative-mode': {
      personality: 'creative and imaginative',
      maxTokens: 8000,
    },
  });

const instructions = agent.compose('agents/main');
```

### Documentation Generation

```typescript
const docs = Mosaic.fromDirectory('docs-templates');

docs.provideVariables({
  projectName: 'My Project',
  version: '1.0.0',
  author: 'John Doe',
});

const readme = docs.compose('documentation/readme');
const apiDocs = docs.compose('documentation/api');
```

## Why Mosaic?

Mosaic was created to solve real-world problems encountered when building AI agent orchestrations and managing complex instruction sets:

### 🔧 IDE Indentation Issues
When writing agent instructions directly in code, IDE auto-indentation would add unwanted whitespace that got passed to AI APIs. Instructions embedded within agent object definitions inherited the surrounding code's indentation, creating formatting issues in the final prompts sent to AI models.

### 📋 Instruction Duplication
Multiple agents in orchestrations often required the same instruction blocks, leading to:
- **Copy-paste proliferation**: Same instructions duplicated across multiple agent definitions
- **Maintenance nightmare**: Updates required manually finding and modifying every duplicate
- **Version drift**: Easy to miss instances during updates, leading to inconsistent instructions

### 🔍 Scattered Instructions
Agent instructions were scattered throughout the codebase wherever agents were defined, making it difficult to:
- **Locate instructions**: No central place to find and review all agent prompts
- **Maintain consistency**: Hard to ensure similar agents used consistent instruction patterns
- **Get overview**: Impossible to see the full instruction landscape at a glance

### 👥 Business-Developer Handoff Friction
When business stakeholders wanted to improve agent instructions, the process was cumbersome:
- **Technical barriers**: Business users couldn't directly edit instructions in code
- **Complex navigation**: Explaining where to find agent definitions and which properties to modify
- **Developer bottleneck**: Every instruction change required developer intervention to implement
- **Slow iteration**: Business improvements were blocked by development cycles

### 🚀 Post-Launch Enhancement Reality
Once AI orchestrations were working, improvements primarily involved instruction refinement rather than code changes:
- **Instructions are the key**: Most performance gains came from better prompts, not code
- **Business expertise needed**: Domain experts, not developers, knew how to improve instructions
- **Developer dependency**: Despite instructions being the main lever, developers were still required for every change

### The Mosaic Solution

Mosaic addresses these problems by:
- **Centralizing instructions** in a dedicated directory structure
- **Enabling direct business user editing** through simple Markdown files
- **Eliminating duplication** through a reference and composition system
- **Removing developer bottlenecks** for instruction updates
- **Providing clean formatting** free from code indentation issues
- **Supporting rapid iteration** on the most impactful part of AI systems: the instructions

This allows AI orchestrations to evolve and improve continuously, with business stakeholders directly contributing their domain expertise without technical barriers.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.

## Related

- [Effect](https://effect.website/) - The foundational library for functional programming in TypeScript
- [Mustache.js](https://github.com/janl/mustache.js/) - Logic-less templates for JavaScript
- [gray-matter](https://github.com/jonschlinkert/gray-matter) - Front-matter parser
- [fast-glob](https://github.com/mrmlnc/fast-glob) - For traversing the file system and returning pathnames that matched a defined set of a specified pattern

