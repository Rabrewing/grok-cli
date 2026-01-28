import { RepoDetector } from './repo.js';
import type { RepoInfo } from './repo.js';

export interface Snapshot {
  repoInfo: RepoInfo;
  timestamp: string;
  rules: string;
}

export class SnapshotGenerator {
  static async generateSnapshot(
    repoRoot: string,
    rulesContent?: string
  ): Promise<Snapshot> {
    const repoInfo = await RepoDetector.getRepoInfo(repoRoot);

    const snapshot: Snapshot = {
      repoInfo,
      timestamp: new Date().toISOString(),
      rules: rulesContent || 'No specific rules loaded.',
    };

    return snapshot;
  }

  static formatSnapshot(snapshot: Snapshot): string {
    const { repoInfo } = snapshot;

    let output = `# 📋 Repository Snapshot: ${repoInfo.root}\\n`;
    output += `**Generated:** ${snapshot.timestamp}\\n\\n`;

    // Section A: Repo identity
    output += `## A) Repo Identity\\n\\n`;
    output += `* **Root:** ${repoInfo.root}\\n`;
    output += `* **Branch:** ${repoInfo.currentBranch}\\n`;
    output += `* **Last 5 Commits:**\\n`;
    for (let i = 0; i < repoInfo.lastCommits.length; i++) {
      output += `  ${i + 1}. ${repoInfo.lastCommits[i].subject} (${repoInfo.lastCommits[i].hash.slice(0, 8)})\\n`;
    }

    // Section B: Working status
    output += `\\n## B) Working Status\\n\\n`;
    output += `* **Status:** ${repoInfo.workingStatus.status}\\n`;
    output += `* **Staged:** ${repoInfo.workingStatus.staged}\\n`;
    output += `* **Unstaged:** ${repoInfo.workingStatus.unstaged}\\n`;
    output += `* **Untracked:** ${repoInfo.workingStatus.untracked}\\n`;

    // Section C: Tech profile
    output += `\\n## C) Tech Profile\\n\\n`;
    output += `* **Package Manager:** ${repoInfo.techProfile.packageManager}\\n`;
    if (repoInfo.techProfile.nodeVersion) {
      output += `* **Node Version:** ${repoInfo.techProfile.nodeVersion}\\n`;
    }
    if (repoInfo.techProfile.frameworks.length > 0) {
      output += `* **Frameworks:** ${repoInfo.techProfile.frameworks.join(', ')}\\n`;
    }

    // Section D: Scripts
    output += `\\n## D) Scripts\\n\\n`;
    const lintScript = repoInfo.scripts.find((s) => s.type === 'lint');
    const testScript = repoInfo.scripts.find((s) => s.type === 'test');
    const buildScript = repoInfo.scripts.find((s) => s.type === 'build');
    const devScript = repoInfo.scripts.find((s) => s.type === 'dev');

    if (lintScript) output += `* **Lint:** \`${lintScript.command}\`\\n`;
    if (testScript) output += `* **Test:** \`${testScript.command}\`\\n`;
    if (buildScript) output += `* **Build:** \`${buildScript.command}\`\\n`;
    if (devScript) output += `* **Dev:** \`${devScript.command}\`\\n`;

    // Section E: Tree
    output += `\\n## E) Tree (bounded)\\n\\n`;
    output += `* **Directories:**\\n`;
    for (const dir of repoInfo.tree.directories) {
      output += `  - ${dir}/\\n`;
    }
    output += `* **Key Paths:**\\n`;
    for (const keyPath of repoInfo.tree.keyPaths) {
      const depth =
        keyPath.depth > 3
          ? `... (depth ${keyPath.depth})`
          : `(depth ${keyPath.depth})`;
      output += `  - ${keyPath.path} ${depth}\\n`;
    }

    // Section F: Hot files
    output += `\\n## F) Hot Files\\n\\n`;
    if (repoInfo.hotFiles.length > 0) {
      for (let i = 0; i < Math.min(repoInfo.hotFiles.length, 10); i++) {
        output += `  ${i + 1}. ${repoInfo.hotFiles[i]}\\n`;
      }
      if (repoInfo.hotFiles.length > 10) {
        output += `  ... +${repoInfo.hotFiles.length - 10} more files\\n`;
      }
    }

    return output;
  }
}
