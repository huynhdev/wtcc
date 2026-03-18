import { diffLines, Change } from 'diff';
import { readFile, exists, getModTime } from '../utils/fs.js';
import chalk from 'chalk';

export interface FileDiff {
  path: string;
  sourceExists: boolean;
  destExists: boolean;
  isIdentical: boolean;
  changes?: Change[];
  sourceModTime?: Date | null;
  destModTime?: Date | null;
}

/**
 * Compare two files and return diff information
 */
export async function compareFiles(
  sourcePath: string,
  destPath: string,
  relativePath: string
): Promise<FileDiff> {
  const sourceExists = await exists(sourcePath);
  const destExists = await exists(destPath);

  const result: FileDiff = {
    path: relativePath,
    sourceExists,
    destExists,
    isIdentical: false,
  };

  if (!sourceExists && !destExists) {
    result.isIdentical = true;
    return result;
  }

  if (!sourceExists || !destExists) {
    return result;
  }

  try {
    const [sourceContent, destContent, sourceModTime, destModTime] = await Promise.all([
      readFile(sourcePath),
      readFile(destPath),
      getModTime(sourcePath),
      getModTime(destPath),
    ]);

    result.sourceModTime = sourceModTime;
    result.destModTime = destModTime;

    if (sourceContent === destContent) {
      result.isIdentical = true;
      return result;
    }

    result.changes = diffLines(destContent, sourceContent);
    return result;
  } catch (error) {
    // Binary files or read errors - just check existence
    return result;
  }
}

/**
 * Format diff for terminal output
 */
export function formatDiff(diff: FileDiff): string {
  if (diff.isIdentical) {
    return chalk.green(`  ${diff.path} (identical)`);
  }

  if (!diff.sourceExists) {
    return chalk.red(`  ${diff.path} (missing in source)`);
  }

  if (!diff.destExists) {
    return chalk.yellow(`  ${diff.path} (new file)`);
  }

  if (!diff.changes) {
    return chalk.yellow(`  ${diff.path} (binary or unreadable)`);
  }

  const lines: string[] = [chalk.yellow(`  ${diff.path}:`)];

  for (const change of diff.changes) {
    const text = change.value.replace(/\n$/, '');
    const changeLines = text.split('\n');

    for (const line of changeLines) {
      if (change.added) {
        lines.push(chalk.green(`    + ${line}`));
      } else if (change.removed) {
        lines.push(chalk.red(`    - ${line}`));
      }
      // Skip unchanged lines for brevity
    }
  }

  return lines.join('\n');
}

/**
 * Get a summary of changes
 */
export function getDiffSummary(diffs: FileDiff[]): {
  identical: number;
  changed: number;
  newFiles: number;
  missing: number;
} {
  return {
    identical: diffs.filter((d) => d.isIdentical).length,
    changed: diffs.filter((d) => !d.isIdentical && d.sourceExists && d.destExists).length,
    newFiles: diffs.filter((d) => d.sourceExists && !d.destExists).length,
    missing: diffs.filter((d) => !d.sourceExists && d.destExists).length,
  };
}
