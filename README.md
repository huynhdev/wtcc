# wtcc - Worktree for Claude Code

A CLI tool for managing git worktrees with configurable file syncing. Perfect for working with Claude Code across multiple feature branches.

## Installation

```bash
npm install -g wtcc
```

Or use directly with npx:

```bash
npx wtcc <command>
```

## Quick Start

1. Initialize in your project:

```bash
cd your-project
wtcc init
```

2. Create a worktree for a new feature:

```bash
wtcc create feature/123-my-feature
```

3. Sync files between worktrees:

```bash
wtcc sync
```

## Commands

### `wtcc create <branch>`

Create a new worktree with the specified branch name.

```bash
wtcc create feature/123-add-oauth
wtcc create hotfix/fix-login-bug
wtcc create feature/123-foo --base main    # Branch from specific base
```

### `wtcc sync [files...]`

Sync files from main worktree to current worktree (or vice versa).

```bash
wtcc sync                    # Sync all configured files
wtcc sync .env CLAUDE.md     # Sync specific files
wtcc sync --reverse          # Sync from current to main
wtcc sync --all              # Sync to all worktrees
wtcc sync --force            # Force overwrite without prompts
```

### `wtcc list`

List all worktrees.

```bash
wtcc list
wtcc ls       # Alias
```

### `wtcc remove [branch]`

Remove worktree(s). Shows interactive multi-select if no branch specified.

```bash
wtcc remove                        # Interactive multi-select
wtcc rm                            # Alias
wtcc remove feature/123-my-feature # Remove specific worktree
wtcc remove --force                # Force removal without confirmation
```

### `wtcc init`

Initialize config file in current project.

```bash
wtcc init
```

### `wtcc config [key] [value]`

Get or set configuration values.

```bash
wtcc config                        # List all config
wtcc config basePath               # Get value
wtcc config worktreePrefix my-app- # Set value
```

## Configuration

Config file: `.wtccrc.yml` in project root.

```yaml
# Base path for worktree creation (relative to project root)
basePath: ../

# Prefix for worktree directory names
worktreePrefix: myproject-

# Files/folders to copy when creating worktree (supports glob patterns)
copyOnCreate:
  - .env
  - .env.local
  - .claude/
  - CLAUDE.md
  - config/master.key
  - config/credentials/*.key

# Files to sync between worktrees
syncFiles:
  - .env
  - CLAUDE.md
  - .claude/settings.json

# Commands/scripts to run after worktree creation
# Environment variables available: WORKTREE_PATH, WORKTREE_NAME, BRANCH_NAME
postCreate:
  - ./scripts/post-create.sh

# Branch naming patterns (for validation)
branchPatterns:
  - feature/<issue>-<description>
  - hotfix/<description>
  - refactor/<issue>-<description>
  - chore/<issue>-<description>
```

## Post-Create Scripts

The `postCreate` commands receive these environment variables:
- `WORKTREE_PATH` - Full path to the new worktree
- `WORKTREE_NAME` - Sanitized name (e.g., `feature-123-my-feature`)
- `BRANCH_NAME` - Original branch name (e.g., `feature/123-my-feature`)

Example script to open iTerm with tmux:

```bash
#!/bin/bash
# scripts/post-create.sh

osascript <<EOF
tell application "iTerm"
    create window with default profile
    tell current session of current window
        write text "cd '$WORKTREE_PATH' && tmux new-session -s '$WORKTREE_NAME'"
    end tell
end tell
EOF
```

## Workflow Example

```bash
# Initialize wtcc in your project
cd ~/projects/my-app
wtcc init

# Start working on a new feature
wtcc create feature/123-user-auth

# Work in the worktree...
# Later, sync .env changes from main
wtcc sync .env

# Or sync your changes back to main
wtcc sync --reverse

# When done, remove the worktree
wtcc remove feature/123-user-auth

# Or remove multiple worktrees interactively
wtcc remove
```

## License

MIT
