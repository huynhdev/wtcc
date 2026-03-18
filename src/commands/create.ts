import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import { WtccConfig } from '../config/schema.js';
import { createWorktree, getGitRoot, isGitRepo } from '../git/worktree.js';
import { copyFiles } from '../sync/copy.js';
import { exists, copy } from '../utils/fs.js';

export interface CreateOptions {
  base?: string;
}

/**
 * Sanitize branch name for directory name
 */
function sanitizeDirName(branchName: string): string {
  return branchName.replace(/\//g, '-');
}

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
 * Create a new worktree
 */
export async function createCommand(
  branchName: string,
  config: WtccConfig,
  configDir: string,
  options: CreateOptions
): Promise<void> {
  // Validate git repo
  if (!(await isGitRepo(configDir))) {
    console.error(chalk.red('Error: Not a git repository'));
    process.exit(1);
  }

  const gitRoot = await getGitRoot(configDir);
  const dirSafeName = sanitizeDirName(branchName);
  const prefix = config.worktreePrefix || path.basename(gitRoot) + '-';
  const worktreePath = path.resolve(gitRoot, config.basePath, `${prefix}${dirSafeName}`);

  console.log(chalk.blue(`Creating worktree for: ${branchName}`));
  console.log(chalk.gray(`Location: ${worktreePath}`));

  // Create worktree
  const spinner = ora('Creating worktree...').start();
  try {
    await createWorktree(branchName, worktreePath, options.base, gitRoot);
    spinner.succeed('Worktree created');
  } catch (error: any) {
    spinner.fail('Failed to create worktree');
    console.error(chalk.red(error.message));
    process.exit(1);
  }

  // Copy files
  if (config.copyOnCreate.length > 0) {
    const copySpinner = ora('Copying files...').start();
    const result = await copyFiles(config.copyOnCreate, gitRoot, worktreePath);

    if (result.copied.length > 0) {
      copySpinner.succeed(`Copied ${result.copied.length} files/folders`);
      for (const file of result.copied) {
        console.log(chalk.gray(`  - ${file}`));
      }
    } else {
      copySpinner.info('No files to copy');
    }

    if (result.skipped.length > 0) {
      console.log(chalk.yellow('Skipped (not found):'));
      for (const file of result.skipped) {
        console.log(chalk.gray(`  - ${file}`));
      }
    }

    if (result.errors.length > 0) {
      console.log(chalk.red('Errors:'));
      for (const { file, error } of result.errors) {
        console.log(chalk.red(`  - ${file}: ${error}`));
      }
    }
  }

  // Copy .wtcc/ folder (built-in, always)
  const wtccSrcDir = path.join(gitRoot, '.wtcc');
  const wtccDestDir = path.join(worktreePath, '.wtcc');
  if (await exists(wtccSrcDir)) {
    const wtccSpinner = ora('Copying .wtcc/ scripts...').start();
    try {
      await copy(wtccSrcDir, wtccDestDir);
      wtccSpinner.succeed('Copied .wtcc/ scripts');
    } catch (error: any) {
      wtccSpinner.warn(`Could not copy .wtcc/: ${error.message}`);
    }
  }

  // Environment variables for postCreate commands
  const env = {
    WORKTREE_PATH: worktreePath,
    WORKTREE_NAME: dirSafeName,
    BRANCH_NAME: branchName,
  };

  // Run post-create commands
  if (config.postCreate && config.postCreate.length > 0) {
    console.log(chalk.blue('\nRunning post-create commands...'));
    for (const cmd of config.postCreate) {
      console.log(chalk.gray(`$ ${cmd}`));
      try {
        const code = await executeWithEnv(cmd, worktreePath, env);
        if (code !== 0) {
          console.error(chalk.yellow(`Warning: Command exited with code ${code}`));
        }
      } catch (error: any) {
        console.error(chalk.yellow(`Warning: Command failed: ${error.message}`));
      }
    }
  }

  console.log(chalk.green('\nWorktree created successfully!'));
  console.log(chalk.gray(`Path: ${worktreePath}`));

  // Run openScript to open the worktree
  if (config.openScript) {
    console.log(chalk.blue('\nOpening worktree...'));
    try {
      await executeWithEnv(config.openScript, configDir, env);
    } catch (error: any) {
      console.error(chalk.yellow(`Warning: Failed to open worktree: ${error.message}`));
    }
  }
}
