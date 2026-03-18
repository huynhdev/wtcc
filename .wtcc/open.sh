#!/bin/bash
# wtcc open script - Terminal (tmux)
# Environment variables:
#   WORKTREE_PATH - full path to worktree
#   WORKTREE_NAME - sanitized name
#   BRANCH_NAME   - original branch name

SESSION_NAME="$WORKTREE_NAME"

# Detect iTerm (works even inside tmux)
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
