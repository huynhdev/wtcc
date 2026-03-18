import path from 'path';
import { execute } from '../utils/shell.js';
import { exists } from '../utils/fs.js';

export interface WorktreeInfo {
  path: string;
  branch: string;
  commit: string;
  isMain: boolean;
  isBare: boolean;
}

/**
 * Check if current directory is a git repository
 */
export async function isGitRepo(dir: string = process.cwd()): Promise<boolean> {
  try {
    await execute('git rev-parse --git-dir', dir);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the root directory of the git repository
 */
export async function getGitRoot(dir: string = process.cwd()): Promise<string> {
  const { stdout } = await execute('git rev-parse --show-toplevel', dir);
  return stdout;
}

/**
 * Get the main worktree path (the original clone location)
 */
export async function getMainWorktreePath(dir: string = process.cwd()): Promise<string> {
  const { stdout } = await execute('git worktree list --porcelain', dir);
  const lines = stdout.split('\n');

  // First worktree entry is the main one
  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      return line.replace('worktree ', '');
    }
  }

  // Fallback to git root
  return getGitRoot(dir);
}

/**
 * List all worktrees
 */
export async function listWorktrees(dir: string = process.cwd()): Promise<WorktreeInfo[]> {
  const { stdout } = await execute('git worktree list --porcelain', dir);
  const worktrees: WorktreeInfo[] = [];

  let current: Partial<WorktreeInfo> = {};
  let isFirst = true;

  for (const line of stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current.path) {
        worktrees.push(current as WorktreeInfo);
      }
      current = {
        path: line.replace('worktree ', ''),
        isMain: isFirst,
        isBare: false,
      };
      isFirst = false;
    } else if (line.startsWith('HEAD ')) {
      current.commit = line.replace('HEAD ', '');
    } else if (line.startsWith('branch ')) {
      current.branch = line.replace('branch refs/heads/', '');
    } else if (line === 'bare') {
      current.isBare = true;
    } else if (line === 'detached') {
      current.branch = '(detached)';
    }
  }

  if (current.path) {
    worktrees.push(current as WorktreeInfo);
  }

  return worktrees;
}

/**
 * Create a new worktree
 */
export async function createWorktree(
  branchName: string,
  worktreePath: string,
  baseBranch?: string,
  dir: string = process.cwd()
): Promise<void> {
  // Check if path already exists
  if (await exists(worktreePath)) {
    throw new Error(`Path already exists: ${worktreePath}`);
  }

  // Check if branch already exists
  const { stdout: branches } = await execute('git branch --list', dir);
  const branchExists = branches.split('\n').some(
    (b) => b.trim().replace('* ', '') === branchName
  );

  if (branchExists) {
    // Use existing branch
    await execute(`git worktree add "${worktreePath}" "${branchName}"`, dir);
  } else {
    // Create new branch from base or current HEAD
    if (baseBranch) {
      await execute(`git worktree add -b "${branchName}" "${worktreePath}" "${baseBranch}"`, dir);
    } else {
      await execute(`git worktree add -b "${branchName}" "${worktreePath}"`, dir);
    }
  }
}

/**
 * Remove a worktree
 */
export async function removeWorktree(worktreePath: string, force: boolean = false): Promise<void> {
  const forceFlag = force ? '--force' : '';
  await execute(`git worktree remove ${forceFlag} "${worktreePath}"`);
}

/**
 * Prune stale worktree references
 */
export async function pruneWorktrees(dir: string = process.cwd()): Promise<void> {
  await execute('git worktree prune', dir);
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(dir: string = process.cwd()): Promise<string> {
  try {
    const { stdout } = await execute('git symbolic-ref --short HEAD', dir);
    return stdout;
  } catch {
    // Detached HEAD
    const { stdout } = await execute('git rev-parse --short HEAD', dir);
    return `(detached at ${stdout})`;
  }
}

/**
 * Check if we're in a worktree (not the main repo)
 */
export async function isWorktree(dir: string = process.cwd()): Promise<boolean> {
  const mainPath = await getMainWorktreePath(dir);
  const gitRoot = await getGitRoot(dir);
  return path.resolve(mainPath) !== path.resolve(gitRoot);
}
