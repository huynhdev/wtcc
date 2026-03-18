import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { WtccConfig, DEFAULT_CONFIG } from './schema.js';

const CONFIG_FILENAME = '.wtccrc.yml';

/**
 * Find config file by walking up the directory tree
 */
export function findConfigFile(startDir: string = process.cwd()): string | null {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const configPath = path.join(currentDir, CONFIG_FILENAME);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Load and parse config file
 */
export function loadConfig(configPath?: string): { config: WtccConfig; configDir: string } | null {
  const foundPath = configPath || findConfigFile();

  if (!foundPath) {
    return null;
  }

  try {
    const content = fs.readFileSync(foundPath, 'utf-8');
    const parsed = yaml.parse(content) as Partial<WtccConfig>;

    const config: WtccConfig = {
      ...DEFAULT_CONFIG,
      ...parsed,
    };

    return {
      config,
      configDir: path.dirname(foundPath),
    };
  } catch (error) {
    throw new Error(`Failed to parse config file ${foundPath}: ${error}`);
  }
}

/**
 * Save config to file
 */
export function saveConfig(config: WtccConfig, configPath: string): void {
  const content = yaml.stringify(config, { indent: 2 });
  fs.writeFileSync(configPath, content, 'utf-8');
}

/**
 * Get config file path for current project
 */
export function getConfigPath(dir: string = process.cwd()): string {
  return path.join(dir, CONFIG_FILENAME);
}

/**
 * Check if config exists in directory
 */
export function configExists(dir: string = process.cwd()): boolean {
  return fs.existsSync(getConfigPath(dir));
}
