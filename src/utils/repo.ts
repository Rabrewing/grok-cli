import fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface RepoInfo {
  root: string;
  currentBranch: string;
  lastCommits: Array<{
    hash: string;
    subject: string;
    author: string;
    date: string;
  }>;
  workingStatus: {
    staged: number;
    unstaged: number;
    untracked: number;
    status: string;
  };
  techProfile: {
    packageManager: 'pnpm' | 'npm' | 'yarn' | 'unknown';
    nodeVersion?: string;
    frameworks: string[];
  };
  scripts: Array<{
    name: string;
    command: string;
    type: 'lint' | 'test' | 'build' | 'dev' | 'other';
  }>;
  tree: {
    directories: string[];
    keyPaths: Array<{
      path: string;
      type: 'dir' | 'file';
      depth: number;
    }>;
  };
  hotFiles: string[];
}

export class RepoDetector {
  static async detectRepoRoot(
    startPath: string = process.cwd()
  ): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git rev-parse --show-toplevel', {
        cwd: startPath,
      });
      return stdout.trim();
    } catch (error) {
      // Fallback: find nearest parent with .git
      let current = path.resolve(startPath);
      while (current !== path.dirname(current)) {
        if (await fs.pathExists(path.join(current, '.git'))) {
          return current;
        }
        current = path.dirname(current);
      }
      return null;
    }
  }

  static async getRepoInfo(root: string): Promise<RepoInfo> {
    const repoInfo: RepoInfo = {
      root,
      currentBranch: await this.getCurrentBranch(root),
      lastCommits: await this.getLastCommits(root, 5),
      workingStatus: await this.getWorkingStatus(root),
      techProfile: await this.getTechProfile(root),
      scripts: await this.getScripts(root),
      tree: await this.getRepoTree(root),
      hotFiles: await this.getHotFiles(root),
    };

    return repoInfo;
  }

  private static async getCurrentBranch(root: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git branch --show-current', {
        cwd: root,
      });
      return stdout.trim();
    } catch (error) {
      return 'unknown';
    }
  }

  private static async getLastCommits(
    root: string,
    count: number
  ): Promise<RepoInfo['lastCommits']> {
    try {
      const { stdout } = await execAsync(
        `git log --pretty=format:"%H|%s|%an|%ad" --date=short -${count}`,
        { cwd: root }
      );

      return stdout.split('\n').map((line) => {
        const [hash, subject, author, date] = line.split('|');
        return { hash: hash.substring(0, 8), subject, author, date };
      });
    } catch (error) {
      return [];
    }
  }

  private static async getWorkingStatus(
    root: string
  ): Promise<RepoInfo['workingStatus']> {
    try {
      const { stdout } = await execAsync('git status --porcelain', {
        cwd: root,
      });
      const lines = stdout
        .trim()
        .split('\n')
        .filter((line) => line);

      let staged = 0,
        unstaged = 0,
        untracked = 0;

      for (const line of lines) {
        if (line.startsWith('??')) untracked++;
        else if (line[0] !== ' ' && line[1] === ' ') staged++;
        else if (line[0] === ' ' && line[1] !== ' ') unstaged++;
        else if (line[0] !== ' ' && line[1] !== ' ') staged++;
      }

      return {
        staged,
        unstaged,
        untracked,
        status: stdout.trim() || 'clean',
      };
    } catch (error) {
      return { staged: 0, unstaged: 0, untracked: 0, status: 'unknown' };
    }
  }

  private static async getTechProfile(
    root: string
  ): Promise<RepoInfo['techProfile']> {
    const packageJsonPath = path.join(root, 'package.json');
    const frameworks: string[] = [];
    let packageManager: 'pnpm' | 'npm' | 'yarn' | 'unknown' = 'unknown';
    let nodeVersion: string | undefined;

    // Detect package manager
    if (await fs.pathExists(path.join(root, 'pnpm-lock.yaml'))) {
      packageManager = 'pnpm';
    } else if (await fs.pathExists(path.join(root, 'package-lock.json'))) {
      packageManager = 'npm';
    } else if (await fs.pathExists(path.join(root, 'yarn.lock'))) {
      packageManager = 'yarn';
    }

    // Detect Node version
    const nvmrcPath = path.join(root, '.nvmrc');
    if (await fs.pathExists(nvmrcPath)) {
      nodeVersion = (await fs.readFile(nvmrcPath, 'utf-8')).trim();
    }

    // Detect frameworks
    if (
      (await fs.pathExists(path.join(root, 'next.config.js'))) ||
      (await fs.pathExists(path.join(root, 'next.config.ts'))) ||
      (await fs.pathExists(path.join(root, 'next.config.mjs')))
    ) {
      frameworks.push('Next.js');
    }

    if (
      (await fs.pathExists(path.join(root, 'vite.config.js'))) ||
      (await fs.pathExists(path.join(root, 'vite.config.ts'))) ||
      (await fs.pathExists(path.join(root, 'vite.config.mjs')))
    ) {
      frameworks.push('Vite');
    }

    if (
      (await fs.pathExists(path.join(root, 'gatsby-config.js'))) ||
      (await fs.pathExists(path.join(root, 'gatsby-config.ts')))
    ) {
      frameworks.push('Gatsby');
    }

    return {
      packageManager,
      nodeVersion,
      frameworks,
    };
  }

  private static async getScripts(root: string): Promise<RepoInfo['scripts']> {
    const packageJsonPath = path.join(root, 'package.json');

    if (!(await fs.pathExists(packageJsonPath))) {
      return [];
    }

    const packageJson = await fs.readJson(packageJsonPath);
    const scripts = packageJson.scripts || {};

    const scriptList: RepoInfo['scripts'] = [];

    for (const [name, command] of Object.entries(scripts)) {
      let type: 'lint' | 'test' | 'build' | 'dev' | 'other' = 'other';

      if (name.includes('lint')) type = 'lint';
      else if (name.includes('test')) type = 'test';
      else if (name.includes('build')) type = 'build';
      else if (name.includes('dev') || name.includes('start')) type = 'dev';

      scriptList.push({ name, command: command as string, type });
    }

    // Sort by type and importance
    return scriptList.sort((a, b) => {
      const typeOrder = { lint: 0, test: 1, build: 2, dev: 3, other: 4 };
      return typeOrder[a.type] - typeOrder[b.type];
    });
  }

  private static async getRepoTree(root: string): Promise<RepoInfo['tree']> {
    const excludeDirs = [
      'node_modules',
      '.next',
      'dist',
      'build',
      '.turbo',
      '.git',
    ];
    const keyPaths = [
      'app',
      'src',
      'lib',
      'components',
      'pages',
      'utils',
      'hooks',
    ];

    const directories: string[] = [];
    const foundPaths: RepoInfo['tree']['keyPaths'] = [];

    // Get top-level directories
    const items = await fs.readdir(root);
    for (const item of items) {
      const itemPath = path.join(root, item);
      const itemStat = await fs.stat(itemPath);
      if (itemStat.isDirectory() && !excludeDirs.includes(item)) {
        directories.push(item);
      }
    }

    // Get key paths with depth
    for (const keyPath of keyPaths) {
      const keyPathFull = path.join(root, keyPath);
      if (await fs.pathExists(keyPathFull)) {
        await this.traversePath(
          keyPathFull,
          keyPath,
          foundPaths,
          excludeDirs,
          3
        );
      }
    }

    return { directories, keyPaths: foundPaths };
  }

  private static async traversePath(
    basePath: string,
    relativePath: string,
    result: RepoInfo['tree']['keyPaths'],
    exclude: string[],
    maxDepth: number,
    currentDepth: number = 0
  ): Promise<void> {
    if (currentDepth >= maxDepth) return;

    try {
      const items = await fs.readdir(basePath);
      for (const item of items) {
        if (exclude.includes(item)) continue;

        const itemPath = path.join(basePath, item);
        const itemRelative = path.join(relativePath, item);
        const stat = await fs.stat(itemPath);

        result.push({
          path: itemRelative,
          type: stat.isDirectory() ? 'dir' : 'file',
          depth: currentDepth + 1,
        });

        if (stat.isDirectory() && currentDepth < maxDepth - 1) {
          await this.traversePath(
            itemPath,
            itemRelative,
            result,
            exclude,
            maxDepth,
            currentDepth + 1
          );
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  private static async getHotFiles(root: string): Promise<string[]> {
    try {
      // Get files from last commit
      const { stdout } = await execAsync(
        'git diff-tree --no-commit-id --name-only -r HEAD',
        { cwd: root }
      );
      const lastCommitFiles = stdout
        .trim()
        .split('\n')
        .filter((f) => f);

      // Get files from last 10 commits
      const { stdout: recentStdout } = await execAsync(
        'git diff-tree --no-commit-id --name-only -r HEAD~10..HEAD',
        { cwd: root }
      );
      const recentFiles = recentStdout
        .trim()
        .split('\n')
        .filter((f) => f);

      // Combine and deduplicate, limit to 20 files
      const allFiles = [...new Set([...lastCommitFiles, ...recentFiles])];
      return allFiles.slice(0, 20);
    } catch (error) {
      return [];
    }
  }
}
