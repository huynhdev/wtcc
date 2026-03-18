#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, findConfigFile } from './config/loader.js';
import { DEFAULT_CONFIG } from './config/schema.js';
import { createCommand, CreateOptions } from './commands/create.js';
import { syncCommand, SyncOptions } from './commands/sync.js';
import { listCommand } from './commands/list.js';
import { removeCommand, RemoveOptions } from './commands/remove.js';
import { initCommand } from './commands/init.js';
import { configCommand } from './commands/config.js';
import { openCommand } from './commands/open.js';

const program = new Command();

program
  .name('wtcc')
  .description('Worktree for Claude Code - Git worktree manager with file syncing')
  .version('0.1.0');

// Create command
program
  .command('create <branch>')
  .description('Create a new worktree')
  .option('-b, --base <branch>', 'Base branch to create from')
  .action(async (branch: string, options: CreateOptions) => {
    const loaded = loadConfig();
    const config = loaded?.config || DEFAULT_CONFIG;
    const configDir = loaded?.configDir || process.cwd();

    if (!loaded) {
      console.log(chalk.yellow('No .wtccrc.yml found. Using defaults.'));
      console.log(chalk.gray('Run `wtcc init` to create a config file.\n'));
    }

    await createCommand(branch, config, configDir, options);
  });

// Sync command
program
  .command('sync [files...]')
  .description('Sync files between worktrees')
  .option('-r, --reverse', 'Sync from current to main')
  .option('-a, --all', 'Sync to all worktrees')
  .option('-f, --force', 'Force overwrite without prompts')
  .action(async (files: string[], options: SyncOptions) => {
    const loaded = loadConfig();

    if (!loaded) {
      console.error(chalk.red('No .wtccrc.yml found.'));
      console.log(chalk.gray('Run `wtcc init` to create a config file.'));
      process.exit(1);
    }

    await syncCommand(files, loaded.config, loaded.configDir, options);
  });

// List command
program
  .command('list')
  .alias('ls')
  .description('List all worktrees')
  .action(async () => {
    const configDir = findConfigFile() ? loadConfig()?.configDir : process.cwd();
    await listCommand(configDir || process.cwd());
  });

// Open command
program
  .command('open [branch]')
  .alias('o')
  .description('Open a worktree - interactive select if no branch specified')
  .action(async (branch: string | undefined) => {
    const loaded = loadConfig();

    if (!loaded) {
      console.error(chalk.red('No .wtccrc.yml found.'));
      console.log(chalk.gray('Run `wtcc init` to create a config file.'));
      process.exit(1);
    }

    await openCommand(branch, loaded.config, loaded.configDir);
  });

// Remove command
program
  .command('remove [branch]')
  .alias('rm')
  .description('Remove worktree(s) - interactive multi-select if no branch specified')
  .option('-f, --force', 'Force removal')
  .action(async (branch: string | undefined, options: RemoveOptions) => {
    const configDir = findConfigFile() ? loadConfig()?.configDir : process.cwd();
    await removeCommand(branch, configDir || process.cwd(), options);
  });

// Init command
program
  .command('init')
  .description('Initialize wtcc config in current project')
  .action(async () => {
    await initCommand();
  });

// Config command
program
  .command('config [key] [value]')
  .description('Get or set configuration')
  .action(async (key?: string, value?: string) => {
    const configDir = findConfigFile() ? loadConfig()?.configDir : undefined;
    await configCommand(key, value, configDir);
  });

// Parse args
program.parse();

// Show help if no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
