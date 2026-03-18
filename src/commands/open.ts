import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import { WtccConfig } from '../config/schema.js';
import { listWorktrees, isGitRepo, WorktreeInfo } from '../git/worktree.js';

/**
 * Execute a command with environment variables
 */
function executeWithEnv(
  command: string,
  cwd: string,
  env: Record<string, string>
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });

    child.on('close', (code) => {
      resolve(code || 0);
    });

    child.on('error', reject);
  });
}

/**
 * Sanitize branch name for directory name
 */
function sanitizeDirName(branchName: string): string {
  return branchName.replace(/\//g, '-');
}

/**
 * Open a worktree - interactive select or by branch name
 */
export async function openCommand(
  branchName: string | undefined,
  config: WtccConfig,
  configDir: string
): Promise<void> {
  // Validate git repo
  if (!(await isGitRepo(configDir))) {
    console.error(chalk.red('Error: Not a git repository'));
    process.exit(1);
  }

  // Check if openScript is configured
  if (!config.openScript) {
    console.error(chalk.red('Error: No openScript configured in .wtccrc.yml'));
    console.log(chalk.gray('Add openScript to your config, e.g.:'));
    console.log(chalk.gray('  openScript: ./scripts/open-worktree.sh'));
    process.exit(1);
  }

  const worktrees = await listWorktrees(configDir);

  if (worktrees.length === 0) {
    console.log(chalk.yellow('No worktrees found.'));
    return;
  }

  let worktreeToOpen: WorktreeInfo | undefined;

  // If branch name provided, find it
  if (branchName) {
    worktreeToOpen = worktrees.find((wt) => {
      if (wt.branch === branchName) return true;
      if (path.basename(wt.path).includes(branchName.replace(/\//g, '-'))) return true;
      return false;
    });

    if (!worktreeToOpen) {
      console.error(chalk.red(`Worktree not found: ${branchName}`));
      console.log(chalk.gray('\nUse `wtcc open` without arguments to select from list.'));
      process.exit(1);
    }
  } else {
    // Interactive select
    const choices = worktrees.map((wt) => ({
      name: `${wt.branch}${wt.isMain ? chalk.gray(' (main)') : ''} ${chalk.gray(`(${wt.path})`)}`,
      value: wt,
      short: wt.branch,
    }));

    const { selected } = await inquirer.prompt<{ selected: WorktreeInfo }>([
      {
        type: 'list',
        name: 'selected',
        message: 'Select worktree to open:',
        choices,
      },
    ]);

    worktreeToOpen = selected;
  }

  // Prepare environment variables
  const dirSafeName = sanitizeDirName(worktreeToOpen.branch || 'unknown');
  const env = {
    WORKTREE_PATH: worktreeToOpen.path,
    WORKTREE_NAME: dirSafeName,
    BRANCH_NAME: worktreeToOpen.branch || 'unknown',
  };

  console.log(chalk.blue(`Opening: ${worktreeToOpen.branch}`));
  console.log(chalk.gray(`Path: ${worktreeToOpen.path}`));

  // Run openScript
  try {
    const code = await executeWithEnv(config.openScript, configDir, env);
    if (code !== 0) {
      console.error(chalk.yellow(`Warning: Script exited with code ${code}`));
    }
  } catch (error: any) {
    console.error(chalk.red(`Error running openScript: ${error.message}`));
    process.exit(1);
  }
}
