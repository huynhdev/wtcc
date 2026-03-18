export type EditorType = 'tmux' | 'cursor' | 'windsurf' | 'vscode' | 'none';

export interface WtccConfig {
  /** Base path for worktree creation (relative to project root) */
  basePath: string;
  /** Prefix for worktree directory names */
  worktreePrefix: string;
  /** Files/folders to copy on create and sync between worktrees */
  copyOnCreate: string[];
  /** Commands/scripts to run after worktree creation */
  postCreate?: string[];
  /** Editor/workflow for opening worktrees */
  editor?: EditorType;
  /** Script to run when opening a worktree */
  openScript?: string;
  /** Branch naming patterns (for validation) */
  branchPatterns?: string[];
}

export const DEFAULT_CONFIG: WtccConfig = {
  basePath: '../',
  worktreePrefix: '',
  copyOnCreate: [],
  postCreate: [],
  editor: 'none',
  openScript: undefined,
  branchPatterns: [],
};
