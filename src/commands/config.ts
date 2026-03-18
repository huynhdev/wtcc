import chalk from 'chalk';
import { loadConfig, saveConfig, getConfigPath, configExists } from '../config/loader.js';
import { WtccConfig } from '../config/schema.js';
import { getGitRoot, isGitRepo } from '../git/worktree.js';

type ConfigKey = keyof WtccConfig;

const EDITABLE_KEYS: ConfigKey[] = [
  'basePath',
  'worktreePrefix',
];

/**
 * Get or set config values
 */
export async function configCommand(
  key?: string,
  value?: string,
  configDir?: string
): Promise<void> {
  const dir = configDir || process.cwd();

  // Validate git repo
  if (!(await isGitRepo(dir))) {
    console.error(chalk.red('Error: Not a git repository'));
    process.exit(1);
  }

  const gitRoot = await getGitRoot(dir);

  if (!configExists(gitRoot)) {
    console.error(chalk.red('Error: No .wtccrc.yml found'));
    console.log(chalk.gray('Run `wtcc init` to create one.'));
    process.exit(1);
  }

  const loaded = loadConfig(getConfigPath(gitRoot));
  if (!loaded) {
    console.error(chalk.red('Error: Failed to load config'));
    process.exit(1);
  }

  const { config } = loaded;
  const configPath = getConfigPath(gitRoot);

  // No key: list all config
  if (!key) {
    console.log(chalk.blue('Current configuration:\n'));
    console.log(chalk.gray(`Config file: ${configPath}\n`));

    for (const [k, v] of Object.entries(config)) {
      if (Array.isArray(v)) {
        console.log(chalk.white(`${k}:`));
        for (const item of v) {
          console.log(chalk.gray(`  - ${item}`));
        }
      } else if (typeof v === 'object' && v !== null) {
        console.log(chalk.white(`${k}:`));
        for (const [subK, subV] of Object.entries(v)) {
          console.log(chalk.gray(`  ${subK}: ${subV}`));
        }
      } else {
        console.log(chalk.white(`${k}: `) + chalk.gray(String(v ?? '(not set)')));
      }
    }
    return;
  }

  // Key only: get value
  if (!value) {
    if (!(key in config)) {
      console.error(chalk.red(`Unknown config key: ${key}`));
      console.log(chalk.gray(`Available keys: ${Object.keys(config).join(', ')}`));
      process.exit(1);
    }

    const val = config[key as ConfigKey];
    if (Array.isArray(val)) {
      console.log(val.join('\n'));
    } else if (typeof val === 'object' && val !== null) {
      console.log(JSON.stringify(val, null, 2));
    } else {
      console.log(val ?? '');
    }
    return;
  }

  // Key and value: set value
  if (!EDITABLE_KEYS.includes(key as ConfigKey)) {
    console.error(chalk.red(`Cannot set '${key}' via CLI`));
    console.log(chalk.gray(`Editable keys: ${EDITABLE_KEYS.join(', ')}`));
    console.log(chalk.gray('For other settings, edit .wtccrc.yml directly.'));
    process.exit(1);
  }

  (config as any)[key] = value;

  saveConfig(config, configPath);
  console.log(chalk.green(`Set ${key} = ${value}`));
}
