import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { expandGlob, exists, addToGitignore } from '../src/utils/fs.js';

describe('fs utils', () => {
  describe('exists', () => {
    it('should return true for existing files', async () => {
      const result = await exists(path.join(process.cwd(), 'package.json'));
      expect(result).toBe(true);
    });

    it('should return false for non-existing files', async () => {
      const result = await exists('/non/existent/path');
      expect(result).toBe(false);
    });
  });

  describe('expandGlob', () => {
    it('should return direct paths that exist', async () => {
      const result = await expandGlob('package.json', process.cwd());
      expect(result).toContain('package.json');
    });

    it('should return empty array for non-matching patterns', async () => {
      const result = await expandGlob('*.nonexistent', process.cwd());
      expect(result).toEqual([]);
    });

    it('should expand glob patterns', async () => {
      const result = await expandGlob('*.ts', path.join(process.cwd(), 'src'));
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((f) => f.endsWith('.ts'))).toBe(true);
    });
  });
});

describe('addToGitignore', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wtcc-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should create .gitignore if it does not exist', async () => {
    await addToGitignore(tempDir, '.wtcc/');
    const content = fs.readFileSync(path.join(tempDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.wtcc/');
  });

  it('should append to existing .gitignore', async () => {
    fs.writeFileSync(path.join(tempDir, '.gitignore'), 'node_modules/\n');
    await addToGitignore(tempDir, '.wtcc/');
    const content = fs.readFileSync(path.join(tempDir, '.gitignore'), 'utf-8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('.wtcc/');
  });

  it('should not duplicate entry if already present', async () => {
    fs.writeFileSync(path.join(tempDir, '.gitignore'), '.wtcc/\n');
    await addToGitignore(tempDir, '.wtcc/');
    const content = fs.readFileSync(path.join(tempDir, '.gitignore'), 'utf-8');
    const matches = content.match(/\.wtcc\//g);
    expect(matches?.length).toBe(1);
  });
});
