import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Mosaic } from '../Mosaic';

describe('Mosaic Functionality', () => {
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
    let mosaic: Mosaic;

    beforeEach(() => {
      mosaic = Mosaic.fromDirectory('tests/fixtures/scenarios');
      mosaic.provideVariables({
        name: 'Jon Snow',
        description: 'Winter is coming',
      });
    });

    test('simple, single-file variable substitution, no children', () => {
      const result = mosaic.compose('1-1-plain-variable-substitution');

      const expectedOutput = [
        'Replacing "name" - Jon Snow: single space.',
        'Replacing "description" - Winter is coming: without spaces.',
        'Replacing "description" - Winter is coming: unequally distributed spaces.',
        'Replacing "inexistent" - : empty string.',
      ].join('\n');

      expect(result).toBe(expectedOutput);
    });

    test('recursive variable substitution, with 1 level of children', () => {
      const result = mosaic.compose('2-1-variable-substitution-with-children');

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

    test('graceful handling of inexistent file reference in expansion', () => {
      // Spy on console.warn to capture warning messages
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = mosaic.compose('1-2-plain-variable-substitution-inexistent');

      const expectedOutput = [
        'The following reference does not exist. Should just show a blank line.',
        '',
      ].join('\n');

      expect(result).toBe(expectedOutput);
      
      // Assert that the warning was logged with the correct message
      expect(consoleWarnSpy).toHaveBeenCalledWith('"inexistent-reference" does not exist. Returning null...');
      
      // Restore the original console.warn
      consoleWarnSpy.mockRestore();
    })
  });

  describe('Self-Reference Handling', () => {
    let mosaic: Mosaic;

    beforeEach(() => {
      mosaic = Mosaic.fromDirectory('tests/fixtures/scenarios');
    });

    test('self-referencing removal, relative content slot', () => {
      const result = mosaic.compose('3-1-self-reference-relative');

      const expectedOutput = [
        'This item self-references itself and Mosaic should simply remove the expansion slot.',
        ''
      ].join('\n');

      expect(result).toBe(expectedOutput);
    });

    test('self-referencing removal, ID content slot', () => {
      const result = mosaic.compose('3-2-self-reference-by-id');

      const expectedOutput = [
        'This item self-references itself and Mosaic should simply remove the expansion slot.',
        ''
      ].join('\n');

      expect(result).toBe(expectedOutput);
    });

    test('self-referencing removal, root content slot', () => {
      const result = mosaic.compose('3-3-self-reference-by-root');

      const expectedOutput = [
        'This item self-references itself and Mosaic should simply remove the expansion slot.',
        ''
      ].join('\n');

      expect(result).toBe(expectedOutput);
    });
  })

  describe('Ancestor Reference Loop Handling', () => {
    let mosaic: Mosaic;

    beforeEach(() => {
      mosaic = Mosaic.fromDirectory('tests/fixtures/scenarios');
    });

    test.skip('ancestor reference loop removal, relative content slot', () => {
      // TODO: implement test
    });

    test.skip('ancestor reference loop removal, ID content slot', () => {
      // TODO: implement test
    });

    test.skip('ancestor reference loop removal, root content slot', () => {
      // TODO: implement test
    });
  })
});
