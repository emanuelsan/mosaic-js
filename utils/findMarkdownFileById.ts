import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import pc from 'picocolors';

/**
 * Searches for a markdown file in a directory tree whose frontmatter id matches the given id.
 * Uses ripgrep to efficiently search only the YAML frontmatter region (between --- at the top).
 * Returns the absolute path to the file if found, otherwise undefined.
 */
export function findMarkdownFileById(rootDir: string, id: string): string | undefined {
  let rgResults: string;
  try {
    rgResults = execSync(
      `rg --type md --null -l -U -e "^id: ?${id}$" "${rootDir}"`,
      { encoding: 'utf-8' }
    );
  } catch (e) {
    // No matches found
    return undefined;
  }

  // rg --null -l returns null-separated file paths
  const files = rgResults.split('\0').filter(Boolean);
  const matches: string[] = [];
  // Check if any of the files have the same id
  // Also check if there are any false positives in the sense that the id is in a comment or something
  // This is done by checking if the id is in the frontmatter, not just in the result from ripgrep
  for (const file of files) {
    const absPath = path.resolve(file);
    const content = fs.readFileSync(absPath, 'utf-8');
    const { data } = matter(content);
    if (data && typeof data.id === 'string' && data.id === id) {
      matches.push(absPath);
    }
  }
  // If there are multiple matches, return the first one but warn the user
  if (matches.length > 1) {
    console.log(pc.yellow(`Warning: Multiple markdown files found with id '#${id}'.\nReturning the first one: ${matches[0]}`));
  }
  return matches[0];
}

