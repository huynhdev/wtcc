import type { EditorType } from './schema.js';

/**
 * Tmux open script - auto-detects terminal and creates tmux session
 * Uses WORKTREE_PATH and WORKTREE_NAME environment variables
 */
const TMUX_OPEN_SCRIPT = `#!/bin/bash
# wtcc open script - Terminal (tmux)
# Environment variables:
#   WORKTREE_PATH - full path to worktree
#   WORKTREE_NAME - sanitized name
#   BRANCH_NAME   - original branch name

SESSION_NAME="$WORKTREE_NAME"

# Detect iTerm (works even inside tmux via ITERM_SESSION_ID)
if [ -n "$ITERM_SESSION_ID" ]; then
    osascript <<EOF
tell application "iTerm"
    create window with default profile
    tell current session of current window
        write text "cd '$WORKTREE_PATH' && tmux new-session -s '$SESSION_NAME' || tmux attach -t '$SESSION_NAME'"
    end tell
end tell
EOF
elif [ "$TERM_PROGRAM" = "Apple_Terminal" ]; then
    osascript <<EOF
tell application "Terminal"
    do script "cd '$WORKTREE_PATH' && tmux new-session -s '$SESSION_NAME' || tmux attach -t '$SESSION_NAME'"
    activate
end tell
EOF
else
    echo "cd $WORKTREE_PATH && tmux new-session -s $SESSION_NAME"
fi
`;

/**
 * Tmux close script - kills tmux session and optionally closes terminal window
 * Uses WORKTREE_NAME environment variable
 */
const TMUX_CLOSE_SCRIPT = `#!/bin/bash
# wtcc close script - Terminal (tmux)
# Kill tmux session and close terminal window

tmux kill-session -t "$WORKTREE_NAME" 2>/dev/null

# Close iTerm/Terminal window running this session
if [ "$TERM_PROGRAM" = "iTerm.app" ]; then
    osascript -e "tell application \\"iTerm\\" to close (every window whose name contains \\"$WORKTREE_NAME\\")" 2>/dev/null
elif [ "$TERM_PROGRAM" = "Apple_Terminal" ]; then
    osascript -e "tell application \\"Terminal\\" to close (every window whose name contains \\"$WORKTREE_NAME\\")" 2>/dev/null
fi
`;

/**
 * Cursor open script - opens Cursor editor at worktree path
 * Uses WORKTREE_PATH environment variable
 */
const CURSOR_OPEN_SCRIPT = `#!/bin/bash
set -e

cursor "$WORKTREE_PATH"
`;

/**
 * Cursor close script - closes Cursor window via AppleScript
 * Uses WORKTREE_PATH environment variable
 */
const CURSOR_CLOSE_SCRIPT = `#!/bin/bash
set -e

# Close Cursor window for this worktree via AppleScript
osascript <<EOF
tell application "Cursor"
  set worktreePath to "$WORKTREE_PATH"
  repeat with w in windows
    try
      if name of w contains "$WORKTREE_NAME" then
        close w
      end if
    end try
  end repeat
end tell
EOF
`;

/**
 * Windsurf open script - opens Windsurf editor at worktree path
 * Uses WORKTREE_PATH environment variable
 */
const WINDSURF_OPEN_SCRIPT = `#!/bin/bash
set -e

windsurf "$WORKTREE_PATH"
`;

/**
 * Windsurf close script - closes Windsurf window via AppleScript
 * Uses WORKTREE_PATH and WORKTREE_NAME environment variables
 */
const WINDSURF_CLOSE_SCRIPT = `#!/bin/bash
set -e

# Close Windsurf window for this worktree via AppleScript
osascript <<EOF
tell application "Windsurf"
  set worktreePath to "$WORKTREE_PATH"
  repeat with w in windows
    try
      if name of w contains "$WORKTREE_NAME" then
        close w
      end if
    end try
  end repeat
end tell
EOF
`;

/**
 * VS Code open script - opens VS Code at worktree path
 * Uses WORKTREE_PATH environment variable
 */
const VSCODE_OPEN_SCRIPT = `#!/bin/bash
set -e

code "$WORKTREE_PATH"
`;

/**
 * VS Code close script - closes VS Code window via AppleScript
 * Uses WORKTREE_PATH and WORKTREE_NAME environment variables
 */
const VSCODE_CLOSE_SCRIPT = `#!/bin/bash
set -e

# Close VS Code window for this worktree via AppleScript
osascript <<EOF
tell application "Visual Studio Code"
  set worktreePath to "$WORKTREE_PATH"
  repeat with w in windows
    try
      if name of w contains "$WORKTREE_NAME" then
        close w
      end if
    end try
  end repeat
end tell
EOF
`;

/**
 * Map of editor types to their open scripts
 */
const OPEN_SCRIPTS: Record<EditorType, string | null> = {
  tmux: TMUX_OPEN_SCRIPT,
  cursor: CURSOR_OPEN_SCRIPT,
  windsurf: WINDSURF_OPEN_SCRIPT,
  vscode: VSCODE_OPEN_SCRIPT,
  none: null,
};

/**
 * Map of editor types to their close scripts
 */
const CLOSE_SCRIPTS: Record<EditorType, string | null> = {
  tmux: TMUX_CLOSE_SCRIPT,
  cursor: CURSOR_CLOSE_SCRIPT,
  windsurf: WINDSURF_CLOSE_SCRIPT,
  vscode: VSCODE_CLOSE_SCRIPT,
  none: null,
};

/**
 * Get the open script template for an editor type
 * @param editor - The editor type
 * @returns The script template or null if no script for that editor
 */
export function getOpenScript(editor: EditorType): string | null {
  return OPEN_SCRIPTS[editor];
}

/**
 * Get the close script template for an editor type
 * @param editor - The editor type
 * @returns The script template or null if no script for that editor
 */
export function getCloseScript(editor: EditorType): string | null {
  return CLOSE_SCRIPTS[editor];
}

// Export script constants for direct access if needed
export {
  TMUX_OPEN_SCRIPT,
  TMUX_CLOSE_SCRIPT,
  CURSOR_OPEN_SCRIPT,
  CURSOR_CLOSE_SCRIPT,
  WINDSURF_OPEN_SCRIPT,
  WINDSURF_CLOSE_SCRIPT,
  VSCODE_OPEN_SCRIPT,
  VSCODE_CLOSE_SCRIPT,
  OPEN_SCRIPTS,
  CLOSE_SCRIPTS,
};
