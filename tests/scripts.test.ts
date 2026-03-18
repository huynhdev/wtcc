import { describe, it, expect } from 'vitest';
import { getOpenScript, getCloseScript } from '../src/config/scripts.js';

describe('script templates', () => {
  describe('getOpenScript', () => {
    it('should return tmux script for tmux editor', () => {
      const script = getOpenScript('tmux');
      expect(script).toContain('#!/bin/bash');
      expect(script).toContain('tmux new-session');
      expect(script).toContain('TERM_PROGRAM');
    });

    it('should return cursor script for cursor editor', () => {
      const script = getOpenScript('cursor');
      expect(script).toContain('cursor "$WORKTREE_PATH"');
    });

    it('should return null for none editor', () => {
      const script = getOpenScript('none');
      expect(script).toBeNull();
    });
  });

  describe('getCloseScript', () => {
    it('should return tmux close script for tmux editor', () => {
      const script = getCloseScript('tmux');
      expect(script).toContain('tmux kill-session');
    });

    it('should return cursor close script for cursor editor', () => {
      const script = getCloseScript('cursor');
      expect(script).toContain('tell application "Cursor"');
    });

    it('should return null for none editor', () => {
      const script = getCloseScript('none');
      expect(script).toBeNull();
    });
  });
});
