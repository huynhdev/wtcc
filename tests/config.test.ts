import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config/schema.js';

describe('config schema', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have required fields', () => {
      expect(DEFAULT_CONFIG.basePath).toBe('../');
      expect(DEFAULT_CONFIG.worktreePrefix).toBe('');
      expect(Array.isArray(DEFAULT_CONFIG.copyOnCreate)).toBe(true);
      expect(Array.isArray(DEFAULT_CONFIG.postCreate)).toBe(true);
      expect(Array.isArray(DEFAULT_CONFIG.branchPatterns)).toBe(true);
    });

    it('should have editor field with valid type', () => {
      expect(DEFAULT_CONFIG.editor).toBe('none');
    });
  });
});
