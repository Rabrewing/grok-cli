import { RulesResolver } from '../utils/rules.js';
import { SnapshotGenerator } from '../utils/snapshot.js';
import fs from 'fs-extra';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export class CommandProcessor {
  static async handleSnapCommand(): Promise<void> {
    try {
      // Detect repo root
      const repoRoot = process.cwd();

      // Load rules
      const rules = await RulesResolver.resolveRules(undefined, repoRoot);
      const sources = rules.map((rule) => rule.source);
      const rulesPrompt = RulesResolver.formatRulesForPrompt(rules, sources);

      // Generate snapshot
      const snapshot = await SnapshotGenerator.generateSnapshot(
        repoRoot,
        rulesPrompt
      );
      const snapshotOutput = SnapshotGenerator.formatSnapshot(snapshot);

      console.log(snapshotOutput);
    } catch (error: any) {
      console.error('Error generating snapshot:', error.message);
      process.exit(1);
    }
  }

  static async handleTicketCommand(task: string): Promise<string> {
    try {
      // Detect repo root
      const repoRoot = process.cwd();

      // Load rules
      const rules = await RulesResolver.resolveRules(undefined, repoRoot);
      const sources = rules.map((rule) => rule.source);
      const rulesPrompt = RulesResolver.formatRulesForPrompt(rules, sources);

      // Generate snapshot
      const snapshot = await SnapshotGenerator.generateSnapshot(
        repoRoot,
        rulesPrompt
      );
      const snapshotOutput = SnapshotGenerator.formatSnapshot(snapshot);

      // Build task packet
      let prompt = `# 🎯 Task: ${task}\n`;
      prompt += `**Repository:** ${repoRoot}\n`;
      prompt += `**Timestamp:** ${new Date().toISOString()}\n\n`;

      if (rulesPrompt) {
        prompt += `${rulesPrompt}\n`;
      }

      if (snapshotOutput) {
        prompt += `${snapshotOutput}\n`;
      }

      prompt += `## 📋 Required Response Format\n`;
      prompt += `When implementing this task, respond using this exact structure:\n\n`;
      prompt += `### A) Plan\n`;
      prompt += `* 3-8 bullets: what you will change and why\n\n`;
      prompt += `### B) Files to Change\n`;
      prompt += `* List exact repo-relative paths\n\n`;
      prompt += `### C) Changes\n`;
      prompt += `* Prefer unified diffs. If asked for full files, output complete file contents.\n\n`;
      prompt += `### D) Commands to Run\n`;
      prompt += `* Provide exact commands for lint/test/build/dev\n\n`;
      prompt += `### E) Rollback Notes\n`;
      prompt += `* How to revert safely (e.g., git checkout -- <file> or revert commit)\n`;

      return prompt;
    } catch (error: any) {
      console.error('Error generating task packet:', error.message);
      process.exit(1);
      return ''; // This line will never be reached due to process.exit
    }
  }

  static async handlePatchCommand(): Promise<void> {
    try {
      // Read diff from stdin
      let diffContent = '';
      process.stdin.setEncoding('utf8');

      for await (const chunk of process.stdin) {
        diffContent += chunk;
      }

      // Apply via git apply
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      await execAsync('git apply', { input: diffContent });
      console.log('✓ Patch applied successfully');
    } catch (error: any) {
      console.error('Error applying patch:', error.message);
      process.exit(1);
    }
  }
}
