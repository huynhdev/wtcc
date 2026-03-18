import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { WtccConfig } from '../config/schema.js';
import { getGitRoot, getMainWorktreePath, listWorktrees, isGitRepo } from '../git/worktree.js';
import { compareFiles, formatDiff, getDiffSummary, FileDiff } from '../sync/diff.js';
import { copySingle } from '../sync/copy.js';
import { expandGlob, exists } from '../utils/fs.js';

export interface SyncOptions {
  reverse?: boolean;
  all?: boolean;
  force?: boolean;
}

type SyncAction = 'overwrite' | 'skip' | 'abort' | 'all';

/**
 * Prompt user for action on conflict
 */
async function promptConflict(diff: FileDiff): Promise<SyncAction> {
  console.log(formatDiff(diff));

  const { action } = await inquirer.prompt<{ action: SyncAction }>([
    {
      type: 'list',
      name: 'action',
      message: `File ${diff.path} differs. What would you like to do?`,
      choices: [
        { name: 'Overwrite with source', value: 'overwrite' },
        { name: 'Skip this file', value: 'skip' },
        { name: 'Overwrite all remaining', value: 'all' },
        { name: 'Abort sync', value: 'abort' },
      ],
    },
  ]);

  return action;
}

/**
 * Sync files between worktrees
 */
export async function syncCommand(
  files: string[],
  config: WtccConfig,
  configDir: string,
  options: SyncOptions
): Promise<void> {
  // Validate git repo
  if (!(await isGitRepo(configDir))) {
    console.error(chalk.red('Error: Not a git repository'));
    process.exit(1);
  }

  const currentDir = await getGitRoot(configDir);
  const mainDir = await getMainWorktreePath(configDir);
  const isInMain = path.resolve(currentDir) === path.resolve(mainDir);

  // Determine source and destination
  let sourceDir: string;
  let destDir: string;

  if (options.reverse) {
    sourceDir = currentDir;
    destDir = mainDir;
  } else {
    sourceDir = mainDir;
    destDir = currentDir;
  }

  // Handle --all flag: sync from main to all other worktrees
  if (options.all) {
    sourceDir = mainDir;
    console.log(chalk.blue('Syncing from main to all worktrees...'));
    console.log(chalk.gray(`Source: ${sourceDir}`));
  } else {
    // Not --all: check if we're in main
    if (isInMain) {
      console.log(chalk.yellow('You are in the main worktree.'));
      console.log(chalk.gray('Use --all to sync to all other worktrees.'));
      return;
    }

    if (options.reverse) {
      console.log(chalk.blue('Syncing from current worktree to main...'));
    } else {
      console.log(chalk.blue('Syncing from main to current worktree...'));
    }
    console.log(chalk.gray(`Source: ${sourceDir}`));
    console.log(chalk.gray(`Destination: ${destDir}`));
  }

  // Get files to sync
  const filesToSync = files.length > 0 ? files : config.copyOnCreate;

  if (filesToSync.length === 0) {
    console.log(chalk.yellow('No files configured for sync. Add files to copyOnCreate in .wtccrc.yml'));
    return;
  }

  // Expand patterns and collect all files
  const expandedFiles: string[] = [];
  for (const pattern of filesToSync) {
    const matches = await expandGlob(pattern, sourceDir);
    expandedFiles.push(...matches);
  }

  if (expandedFiles.length === 0) {
    console.log(chalk.yellow('No matching files found to sync.'));
    return;
  }

  // Handle --all flag to sync to all worktrees
  if (options.all) {
    const worktrees = await listWorktrees(configDir);
    const otherWorktrees = worktrees.filter((wt) =>
      path.resolve(wt.path) !== path.resolve(sourceDir) && !wt.isBare
    );

    if (otherWorktrees.length === 0) {
      console.log(chalk.yellow('No other worktrees found.'));
      return;
    }

    for (const worktree of otherWorktrees) {
      console.log(chalk.blue(`\nSyncing to: ${worktree.path} (${worktree.branch})`));
      await syncToDestination(expandedFiles, sourceDir, worktree.path, options.force || false);
    }
    return;
  }

  await syncToDestination(expandedFiles, sourceDir, destDir, options.force || false);
}

async function syncToDestination(
  files: string[],
  sourceDir: string,
  destDir: string,
  force: boolean
): Promise<void> {
  // Compare files
  const spinner = ora('Comparing files...').start();
  const diffs: FileDiff[] = [];

  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);
    const diff = await compareFiles(sourcePath, destPath, file);
    diffs.push(diff);
  }

  spinner.stop();

  const summary = getDiffSummary(diffs);
  console.log(chalk.gray(`\nFiles: ${diffs.length} total, ${summary.changed} changed, ${summary.newFiles} new, ${summary.identical} identical`));

  if (summary.changed === 0 && summary.newFiles === 0) {
    console.log(chalk.green('\nAll files are already in sync!'));
    return;
  }

  // Process each file
  let overwriteAll = force;
  let synced = 0;
  let skipped = 0;

  for (const diff of diffs) {
    if (diff.isIdentical) {
      continue;
    }

    if (!diff.sourceExists) {
      console.log(chalk.gray(`Skipping ${diff.path} (missing in source)`));
      skipped++;
      continue;
    }

    // New file or changed file
    if (overwriteAll) {
      await copySingle(diff.path, sourceDir, destDir);
      console.log(chalk.green(`  Synced: ${diff.path}`));
      synced++;
      continue;
    }

    // Prompt for action
    const action = await promptConflict(diff);

    switch (action) {
      case 'overwrite':
        await copySingle(diff.path, sourceDir, destDir);
        console.log(chalk.green(`  Synced: ${diff.path}`));
        synced++;
        break;
      case 'skip':
        console.log(chalk.gray(`  Skipped: ${diff.path}`));
        skipped++;
        break;
      case 'all':
        overwriteAll = true;
        await copySingle(diff.path, sourceDir, destDir);
        console.log(chalk.green(`  Synced: ${diff.path}`));
        synced++;
        break;
      case 'abort':
        console.log(chalk.yellow('\nSync aborted.'));
        return;
    }
  }

  console.log(chalk.green(`\nSync complete: ${synced} synced, ${skipped} skipped`));
}
