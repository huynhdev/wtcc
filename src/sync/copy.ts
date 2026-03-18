import path from 'path';
import { copy, exists, expandGlob, isDirectory } from '../utils/fs.js';

export interface CopyResult {
  copied: string[];
  skipped: string[];
  errors: Array<{ file: string; error: string }>;
}

/**
 * Copy files from source to destination based on patterns
 */
export async function copyFiles(
  patterns: string[],
  sourceDir: string,
  destDir: string
): Promise<CopyResult> {
  const result: CopyResult = {
    copied: [],
    skipped: [],
    errors: [],
  };

  for (const pattern of patterns) {
    try {
      const matches = await expandGlob(pattern, sourceDir);

      if (matches.length === 0) {
        result.skipped.push(pattern);
        continue;
      }

      for (const match of matches) {
        const sourcePath = path.join(sourceDir, match);
        const destPath = path.join(destDir, match);

        try {
          await copy(sourcePath, destPath);
          result.copied.push(match);
        } catch (error: any) {
          result.errors.push({ file: match, error: error.message });
        }
      }
    } catch (error: any) {
      result.errors.push({ file: pattern, error: error.message });
    }
  }

  return result;
}

/**
 * Copy a single file or directory
 */
export async function copySingle(
  relativePath: string,
  sourceDir: string,
  destDir: string
): Promise<void> {
  const sourcePath = path.join(sourceDir, relativePath);
  const destPath = path.join(destDir, relativePath);

  if (!(await exists(sourcePath))) {
    throw new Error(`Source does not exist: ${sourcePath}`);
  }

  await copy(sourcePath, destPath);
}
