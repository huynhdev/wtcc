import path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { listWorktrees, removeWorktree, isGitRepo, pruneWorktrees, WorktreeInfo } from '../git/worktree.js';
import { exists } from '../utils/fs.js';

export interface RemoveOptions {
  force?: boolean;
}

/**
 * Execute close script for a worktree
 */
async function executeCloseScript(
  worktreePath: string,
  worktreeName: string,
  configDir: string
): Promise<void> {
  const closeScriptPath = path.join(worktreePath, '.wtcc', 'close.sh');

  if (!(await exists(closeScriptPath))) {
    return; // No close script, skip silently
  }

  const env = {
    ...process.env,
    WORKTREE_PATH: worktreePath,
    WORKTREE_NAME: worktreeName,
  };

  return new Promise((resolve) => {
    const child = spawn('bash', [closeScriptPath], {
      cwd: configDir,
      env,
      stdio: 'pipe', // Suppress output
    });

    child.on('close', () => resolve());
    child.on('error', () => resolve()); // Fail silently
  });
}

/**
 * Remove worktrees - interactive multi-select or by branch name
 */
export async function removeCommand(
  branchName: string | undefined,
  configDir: string,
  options: RemoveOptions
): Promise<void> {
  // Validate git repo
  if (!(await isGitRepo(configDir))) {
    console.error(chalk.red('Error: Not a git repository'));
    process.exit(1);
  }

  const worktrees = await listWorktrees(configDir);
  const removableWorktrees = worktrees.filter((wt) => !wt.isMain && !wt.isBare);

  if (removableWorktrees.length === 0) {
    console.log(chalk.yellow('No worktrees to remove (only main worktree exists).'));
    return;
  }

  let worktreesToRemove: WorktreeInfo[] = [];

  // If branch name provided, find it
  if (branchName) {
    const worktree = removableWorktrees.find((wt) => {
      if (wt.branch === branchName) return true;
      if (path.basename(wt.path).includes(branchName.replace(/\//g, '-'))) return true;
      return false;
    });

    if (!worktree) {
      console.error(chalk.red(`Worktree not found: ${branchName}`));
      console.log(chalk.gray('\nUse `wtcc remove` without arguments to select from list.'));
      process.exit(1);
    }

    worktreesToRemove = [worktree];
  } else {
    // Interactive multi-select
    const choices = removableWorktrees.map((wt) => ({
      name: `${wt.branch} ${chalk.gray(`(${wt.path})`)}`,
      value: wt,
      short: wt.branch,
    }));

    const { selected } = await inquirer.prompt<{ selected: WorktreeInfo[] }>([
      {
        type: 'checkbox',
        name: 'selected',
        message: 'Select worktrees to remove:',
        choices,
        validate: (answer) => {
          if (answer.length === 0) {
            return 'Please select at least one worktree, or press Ctrl+C to cancel.';
          }
          return true;
        },
      },
    ]);

    if (selected.length === 0) {
      console.log(chalk.yellow('No worktrees selected.'));
      return;
    }

    worktreesToRemove = selected;
  }

  // Show what will be removed
  console.log(chalk.blue(`\nWorktrees to remove (${worktreesToRemove.length}):`));
  for (const wt of worktreesToRemove) {
    console.log(chalk.white(`  - ${wt.branch} ${chalk.gray(`(${wt.path})`)}`));
  }

  // Confirm unless forced
  if (!options.force) {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to remove ${worktreesToRemove.length} worktree(s)?`,
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Cancelled.'));
      return;
    }
  }

  // Remove each worktree
  let successCount = 0;
  let failCount = 0;

  for (const wt of worktreesToRemove) {
    const spinner = ora(`Removing ${wt.branch}...`).start();

    try {
      // Run close script first (silent fail)
      const worktreeName = path.basename(wt.path);
      spinner.text = `Closing editor for ${wt.branch}...`;
      await executeCloseScript(wt.path, worktreeName, configDir);

      // Remove worktree
      spinner.text = `Removing ${wt.branch}...`;
      await removeWorktree(wt.path, options.force);
      spinner.succeed(`Removed ${wt.branch}`);
      successCount++;
    } catch (error: any) {
      spinner.fail(`Failed to remove ${wt.branch}`);
      console.error(chalk.red(`  ${error.message}`));
      failCount++;
    }
  }

  // Prune stale references
  await pruneWorktrees(configDir);

  // Summary
  console.log();
  if (successCount > 0) {
    console.log(chalk.green(`Successfully removed ${successCount} worktree(s).`));
  }
  if (failCount > 0) {
    console.log(chalk.red(`Failed to remove ${failCount} worktree(s).`));
    if (!options.force) {
      console.log(chalk.yellow('Try using --force to force removal.'));
    }
  }
}
