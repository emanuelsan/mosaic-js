import { describe, test, expect } from 'vitest';
import { Mosaic } from '../Mosaic';

describe('Mosaic', () => {
  test('should compose a template correctly', () => {
    // Set the root directory of the templates
    const mosaic = Mosaic.fromDirectory('tests/fixtures/instructions');

    // Provide variables
    mosaic.provideVariables({ name: 'World' });

    // Compose a template starting from 'main'
    const result = mosaic.compose('main');

    const expectedOutput = [
      '',
      'Hello, World!',
      'This is the main template.',
      'This is a greeting from a partial.',
      '',
    ].join('\n');

    expect(result).toBe(expectedOutput);
  });

  describe('Variables Substitution', () => {
    test('simple, single-file variable substitution, no children', () => {
      const mosaic = Mosaic.fromDirectory('tests/fixtures/scenarios');

      mosaic.provideVariables({
        name: 'Jon Snow',
        description: 'Winter is coming',
      });

      const result = mosaic.compose('1-plain-variable-substitution');

      const expectedOutput = [
        'Replacing "name" - Jon Snow: single space.',
        'Replacing "description" - Winter is coming: without spaces.',
        'Replacing "description" - Winter is coming: unequally distributed spaces.',
        'Replacing "inexistent" - : empty string.',
      ].join('\n');

      expect(result).toBe(expectedOutput);
    });

    test('recursive variable substitution, with 1 level of children', () => {
      const mosaic = Mosaic.fromDirectory('tests/fixtures/scenarios');

      mosaic.provideVariables({
        name: 'Jon Snow',
        description: 'Winter is coming',
      });

      const result = mosaic.compose('2-variable-substitution-with-children');

      const expectedOutput = [
        'Replacing "name" - Jon Snow: single space.',
        'Replacing "description" - Winter is coming: without spaces.',
        '',
        'Child:',
        'Replacing "description" - Winter is coming: unequally distributed spaces.',
        'Replacing "inexistent" - : empty string.',
      ].join('\n');

      expect(result).toBe(expectedOutput);
    });
  });
});
