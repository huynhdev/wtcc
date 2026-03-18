import { WtccConfig } from './schema.js';

/**
 * Generate a default config with common patterns
 */
export function generateDefaultConfig(projectName: string): WtccConfig {
  return {
    basePath: '../',
    worktreePrefix: `${projectName}-`,
    copyOnCreate: [
      '.env',
      '.env.local',
      '.claude/',
      'CLAUDE.md',
    ],
    postCreate: [],
    branchPatterns: [
      'feature/<issue>-<description>',
      'hotfix/<description>',
      'refactor/<issue>-<description>',
      'chore/<issue>-<description>',
    ],
  };
}

/**
 * Config template as YAML string with comments
 */
export function generateConfigTemplate(projectName: string): string {
  return `# wtcc - Worktree for Claude Code
# Configuration file

# Base path for worktree creation (relative to project root)
basePath: ../

# Prefix for worktree directory names
worktreePrefix: ${projectName}-

# Files/folders to copy on create and sync between worktrees
copyOnCreate:
  - .env
  - .env.local
  - .claude/
  - CLAUDE.md
  # Add more files as needed:
  # - config/master.key
  # - config/credentials/*.key

# Commands/scripts to run after worktree creation
# Environment variables available: WORKTREE_PATH, WORKTREE_NAME, BRANCH_NAME
postCreate: []
  # - npm install
  # - bundle install

# Script to run when opening a worktree (also runs after create)
# openScript: ./scripts/open-worktree.sh

# Branch naming patterns (for validation, optional)
branchPatterns:
  - feature/<issue>-<description>
  - hotfix/<description>
  - refactor/<issue>-<description>
  - chore/<issue>-<description>
`;
}
