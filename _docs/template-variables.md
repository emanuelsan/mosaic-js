# Description
Template variables allow you to inject dynamic values into your Mosaic templates using mustache syntax (`{{ $variableName }}`). Variables are provided using the chainable `.provideVariables()` and `.provideOverrides()` methods on a Mosaic instance.

# General Principles
- **Global Variables**: Variables provided via `.provideVariables()` are available throughout the entire template hierarchy. Anywhere a `{{ $variableName }}` appears, it will be replaced with the global value.
- **Path-Specific Overrides**: Variables provided via `.provideOverrides()` target specific templates using selector syntax. These override global variables for that specific template only.
- **Precedence Rules**: Path-specific overrides always take precedence over global variables when expanding content in the targeted template.
- **Path Normalization**: Override paths are automatically normalized to relative syntax, regardless of the original selector format (ID `#selector`, root `@selector`, or relative `path/to/template`).
- **Chainable API**: Multiple calls to `.provideVariables()` can be chained, with later calls overriding earlier ones for variables with the same name.

# API Usage

## Creating a Mosaic Instance
```typescript
const mosaic = Mosaic.fromDirectory('path/to/templates');
```

## Providing Global Variables
```typescript
// Single call
mosaic.provideVariables({
  numberOfAttempts: 5,
  leaderName: 'Peter Pan',
});

// Chainable calls (later calls override earlier ones)
mosaic
  .provideVariables({
    numberOfAttempts: 5,
    leaderName: 'Peter Pan',
  })
  .provideVariables({
    leaderName: 'John Snow', // Overrides 'Peter Pan'
    specialInstructions: 'Do not harm humans in any way.',
  });
```

## Providing Path-Specific Overrides
```typescript
mosaic.provideOverrides({
  '#special-rules': {           // ID selector
    numberOfAttempts: 15,       // Overrides global value for this template
  },
  'company-info/description': { // Relative path selector
    leaderName: 'John Snow',    // Overrides global value for this template
  },
  '@root-template': {           // Root selector
    customValue: 'special',
  },
});
```

## Composing the Final Template
```typescript
const result = mosaic.compose('root-template-selector');
console.log(result);
```

# Data Types

```typescript
type TemplateVariables = {
  [variableName: string]: string | number;
};

type TemplateOverrides = {
  [templateSelector: string]: TemplateVariables;
};
```

# Complete Example

```typescript
import { Mosaic } from './Mosaic';

// 1. Create a new Mosaic instance from a directory
const instructions = Mosaic.fromDirectory('src/instructions');

// 2. Provide global variables using the chainable API
instructions
  .provideVariables({
    numberOfAttempts: 5,
    leaderName: 'Peter Pan',
  })
  .provideVariables({
    leaderName: 'John Snow',  // Overrides 'Peter Pan'
    specialInstructions: 'Do not harm humans in any way.',
  });

// 3. Provide path-specific overrides
instructions.provideOverrides({
  '#special-rules': {
    numberOfAttempts: 15,  // Only for special-rules template
  },
  'company-info/description': {
    leaderName: 'John Snow',  // Only for company-info/description template
  },
});

// 4. Compose the final template
const result = instructions.compose('agents/wiley-coyote');
console.log(result);
```

# Template Syntax

In your markdown templates, use mustache syntax with a `$` prefix:

```markdown
---
id: example-template
---

# Welcome {{ $leaderName }}!

You have {{ $numberOfAttempts }} attempts to complete this task.

{{ $specialInstructions }}
```

# Tips
- Use camelCase for variable names to distinguish them from template selectors
- Use quotes around template selectors in overrides for visual clarity
- Path-specific overrides only affect the targeted template, not its children or parents
- Variables are expanded when each template's content is processed, ensuring correct precedence