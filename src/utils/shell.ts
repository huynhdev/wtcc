import { execFile, spawn } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/**
 * Execute a shell command safely using execFile
 * For git commands, we split the command and use execFile to prevent injection
 */
export async function execute(command: string, cwd?: string): Promise<ExecResult> {
  const parts = parseCommand(command);
  const [cmd, ...args] = parts;

  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      shell: needsShell(command),
    });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.stderr || error.message}`);
  }
}

/**
 * Parse a command string into parts, respecting quotes
 */
function parseCommand(command: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuote: string | null = null;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === ' ') {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

/**
 * Check if command needs shell (has pipes, redirects, etc.)
 */
function needsShell(command: string): boolean {
  return /[|><&;]/.test(command);
}

/**
 * Execute a command with live output (for long-running commands)
 */
export function executeWithOutput(command: string, cwd?: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const parts = parseCommand(command);
    const [cmd, ...args] = parts;

    const child = spawn(cmd, args, {
      cwd,
      shell: needsShell(command),
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

/**
 * Check if a command exists
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    await execute(`which ${command}`);
    return true;
  } catch {
    return false;
  }
}
