import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { configExists, getConfigPath } from '../config/loader.js';
import { EditorType } from '../config/schema.js';
import { getOpenScript, getCloseScript } from '../config/scripts.js';
import { isGitRepo, getGitRoot } from '../git/worktree.js';
import { writeFile, exists, addToGitignore } from '../utils/fs.js';

interface InitAnswers {
  filesToCopy: string;
  editor: EditorType;
}

interface EditorChoice {
  name: string;
  value: EditorType;
}

const EDITOR_CHOICES: EditorChoice[] = [
  { name: 'Terminal (tmux) - Opens new terminal window with tmux session', value: 'tmux' },
  { name: 'Cursor - Opens Cursor IDE', value: 'cursor' },
  { name: 'Windsurf - Opens Windsurf IDE', value: 'windsurf' },
  { name: 'VS Code - Opens VS Code', value: 'vscode' },
  { name: "None - Skip, I'll configure manually", value: 'none' },
];

/**
 * Initialize wtcc config in current project
 */
export async function initCommand(dir: string = process.cwd()): Promise<void> {
  // Check if we're in a git repo
  if (!(await isGitRepo(dir))) {
    console.error(chalk.red('Error: Not a git repository'));
    console.log(chalk.gray('Initialize a git repository first with: git init'));
    process.exit(1);
  }

  const gitRoot = await getGitRoot(dir);
  const configPath = getConfigPath(gitRoot);
  const wtccDir = path.join(gitRoot, '.wtcc');
  const openScriptPath = path.join(wtccDir, 'open.sh');
  const closeScriptPath = path.join(wtccDir, 'close.sh');

  // Check if config already exists
  if (configExists(gitRoot)) {
    const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Config file already exists. Overwrite?',
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Cancelled.'));
      return;
    }
  }

  const projectName = path.basename(gitRoot);

  console.log(chalk.blue(`\nInitializing wtcc for: ${projectName}\n`));

  // Interactive prompts - simplified 2-question flow
  const answers = await inquirer.prompt<InitAnswers>([
    {
      type: 'input',
      name: 'filesToCopy',
      message: 'Files to copy to new worktrees (comma-separated):',
      default: '.env, .env.local, .claude/, CLAUDE.md',
    },
    {
      type: 'list',
      name: 'editor',
      message: 'How do you want to open worktrees?',
      choices: EDITOR_CHOICES,
      default: 'tmux',
    },
  ]);

  // Parse files to copy
  const copyOnCreate = answers.filesToCopy
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);

  // Handle existing scripts - prompt if open.sh already exists
  let shouldWriteScripts = answers.editor !== 'none';
  if (shouldWriteScripts && (await exists(openScriptPath))) {
    const { overwriteScript } = await inquirer.prompt<{ overwriteScript: boolean }>([
      {
        type: 'confirm',
        name: 'overwriteScript',
        message: 'Open script already exists. Overwrite?',
        default: false,
      },
    ]);
    shouldWriteScripts = overwriteScript;
  }

  // Generate config content
  let configContent = `# wtcc - Worktree for Claude Code
# Configuration file for ${projectName}

# Base path for worktree creation (relative to project root)
basePath: ../

# Prefix for worktree directory names
worktreePrefix: ${projectName}-

# Files/folders to copy on create and sync between worktrees
copyOnCreate:
${copyOnCreate.map((f) => `  - ${f}`).join('\n')}

# Commands/scripts to run after worktree creation
# Environment variables available: WORKTREE_PATH, WORKTREE_NAME, BRANCH_NAME
postCreate:
  # - ./scripts/post-create.sh

# Editor/workflow for opening worktrees
editor: ${answers.editor}
`;

  // Add openScript to config if scripts will be written
  if (shouldWriteScripts && answers.editor !== 'none') {
    configContent += `
# Script to run when opening a worktree
openScript: ./.wtcc/open.sh
`;
  }

  configContent += `
# Branch naming patterns for validation (optional)
branchPatterns:
  - feature/<issue>-<description>
  - hotfix/<description>
  - refactor/<issue>-<description>
  - chore/<issue>-<description>
`;

  // Write config
  await writeFile(configPath, configContent);
  console.log(chalk.green(`\n✓ Config created: .wtccrc.yml`));

  // Generate scripts if editor is not 'none' and user wants to write them
  if (shouldWriteScripts && answers.editor !== 'none') {
    const openScript = getOpenScript(answers.editor);
    const closeScript = getCloseScript(answers.editor);

    if (openScript) {
      // Create .wtcc directory
      await fs.promises.mkdir(wtccDir, { recursive: true });

      // Write open.sh
      await writeFile(openScriptPath, openScript);
      await fs.promises.chmod(openScriptPath, 0o755);
      console.log(chalk.green(`✓ Open script created: .wtcc/open.sh`));

      // Write close.sh
      if (closeScript) {
        await writeFile(closeScriptPath, closeScript);
        await fs.promises.chmod(closeScriptPath, 0o755);
        console.log(chalk.green(`✓ Close script created: .wtcc/close.sh`));
      }

      // Add .wtcc/ to .gitignore
      const added = await addToGitignore(gitRoot, '.wtcc/');
      if (added) {
        console.log(chalk.green(`✓ Added .wtcc/ to .gitignore`));
      }
    }
  }

  console.log(chalk.gray('\nYou can now use:'));
  console.log(chalk.white('  wtcc create feature/my-feature'));
  console.log(chalk.white('  wtcc list'));
  console.log(chalk.white('  wtcc sync'));
}
