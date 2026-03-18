import path from 'path';
import chalk from 'chalk';
import { listWorktrees, isGitRepo, getGitRoot } from '../git/worktree.js';

/**
 * List all worktrees
 */
export async function listCommand(configDir: string): Promise<void> {
  // Validate git repo
  if (!(await isGitRepo(configDir))) {
    console.error(chalk.red('Error: Not a git repository'));
    process.exit(1);
  }

  const worktrees = await listWorktrees(configDir);

  if (worktrees.length === 0) {
    console.log(chalk.yellow('No worktrees found.'));
    return;
  }

  const currentDir = await getGitRoot();

  console.log(chalk.blue('Worktrees:\n'));

  for (const wt of worktrees) {
    const isCurrent = path.resolve(wt.path) === path.resolve(currentDir);
    const marker = isCurrent ? chalk.green('* ') : '  ';
    const mainBadge = wt.isMain ? chalk.gray(' (main)') : '';
    const branch = wt.branch || '(detached)';

    console.log(`${marker}${chalk.white(wt.path)}`);
    console.log(chalk.gray(`    Branch: ${branch}${mainBadge}`));
    if (wt.commit) {
      console.log(chalk.gray(`    Commit: ${wt.commit.substring(0, 8)}`));
    }
    console.log();
  }

  console.log(chalk.gray(`Total: ${worktrees.length} worktree(s)`));
}
