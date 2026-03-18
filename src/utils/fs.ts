import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

/**
 * Copy a file or directory recursively
 */
export async function copy(src: string, dest: string): Promise<void> {
  const stat = await fs.promises.stat(src);

  if (stat.isDirectory()) {
    await copyDir(src, dest);
  } else {
    await copyFile(src, dest);
  }
}

/**
 * Copy a single file
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  const destDir = path.dirname(dest);
  await fs.promises.mkdir(destDir, { recursive: true });
  await fs.promises.copyFile(src, dest);
}

/**
 * Copy a directory recursively
 */
export async function copyDir(src: string, dest: string): Promise<void> {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

/**
 * Check if a path exists
 */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if path is a directory
 */
export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(filePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Expand glob patterns to file paths
 */
export async function expandGlob(pattern: string, cwd: string): Promise<string[]> {
  // If pattern ends with /, treat it as a directory
  if (pattern.endsWith('/')) {
    const dirPath = path.join(cwd, pattern.slice(0, -1));
    if (await isDirectory(dirPath)) {
      return [pattern.slice(0, -1)];
    }
    return [];
  }

  // Check if it's a direct file/directory path (no glob characters)
  if (!pattern.includes('*') && !pattern.includes('?') && !pattern.includes('[')) {
    const fullPath = path.join(cwd, pattern);
    if (await exists(fullPath)) {
      return [pattern];
    }
    return [];
  }

  // Use glob for patterns
  const matches = await glob(pattern, {
    cwd,
    nodir: false,
    dot: true,
  });

  return matches;
}

/**
 * Read file contents
 */
export async function readFile(filePath: string): Promise<string> {
  return fs.promises.readFile(filePath, 'utf-8');
}

/**
 * Write file contents
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(filePath, content, 'utf-8');
}

/**
 * Get file modification time
 */
export async function getModTime(filePath: string): Promise<Date | null> {
  try {
    const stat = await fs.promises.stat(filePath);
    return stat.mtime;
  } catch {
    return null;
  }
}

/**
 * Add an entry to .gitignore if not already present
 */
export async function addToGitignore(dir: string, entry: string): Promise<boolean> {
  const gitignorePath = path.join(dir, '.gitignore');
  let content = '';

  if (await exists(gitignorePath)) {
    content = await readFile(gitignorePath);
    // Check if entry already exists (as a line)
    const lines = content.split('\n').map((l) => l.trim());
    if (lines.includes(entry.trim())) {
      return false; // Already present
    }
  }

  // Append entry with newline
  const newContent = content.endsWith('\n') || content === ''
    ? content + entry + '\n'
    : content + '\n' + entry + '\n';

  await writeFile(gitignorePath, newContent);
  return true;
}
