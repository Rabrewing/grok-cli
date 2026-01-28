import fs from 'fs-extra';
import * as path from 'path';

export interface RuleSet {
  content: string;
  source: string;
  priority: number;
}

export class RulesResolver {
  static async resolveRules(
    rulesPath?: string,
    repoRoot?: string
  ): Promise<RuleSet[]> {
    const rules: RuleSet[] = [];
    const sources = [];

    // 1. Explicit rules path provided
    if (rulesPath) {
      try {
        const content = await fs.readFile(rulesPath, 'utf-8');
        rules.push({ content, source: rulesPath, priority: 1 });
        sources.push(`Explicit: ${rulesPath}`);
      } catch (error) {
        // Skip if file doesn't exist or can't read
      }
    }

    // 2. Repo root (first existing)
    if (repoRoot) {
      const repoRules = ['AGENTS.md', 'GROK_RULES.md', '.grok/rules.md'];
      for (const ruleFile of repoRules) {
        const fullPath = path.join(repoRoot, ruleFile);
        if (await fs.pathExists(fullPath)) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            rules.push({ content, source: `repo/${ruleFile}`, priority: 2 });
            sources.push(`Repo: ${ruleFile}`);
          } catch (error) {
            // Skip if can't read
          }
        }
      }
    }

    // 3. User global (first existing)
    const userRules = [
      '~/.config/grok/rules.md',
      '~/brewdocs/GROK_GLOBAL_RULES.md',
    ];
    for (const ruleFile of userRules) {
      const expandedPath = ruleFile.replace(/^~\//, process.env.HOME + '/');
      if (await fs.pathExists(expandedPath)) {
        try {
          const content = await fs.readFile(expandedPath, 'utf-8');
          rules.push({ content, source: `user/${ruleFile}`, priority: 3 });
          sources.push(`User: ${ruleFile}`);
        } catch (error) {
          // Skip if can't read
        }
      }
    }

    return rules;
  }

  static async loadDefaultRules(): Promise<RuleSet> {
    const defaultRules = `# GROK CLI - Default Rules (Fallback)

**Owner:** RB (BrewVerse)
**Mode:** Repo Dev Mode (local-only)
**Updated:** 2026-01-26

## 1) Mission

You are Grok running in a terminal inside a software repository. Your job is to help implement features, fixes, refactors, and tests **inside of repo** while maintaining reliability, auditability, and consistent style.

## 2) Hard Safety Rules

1. **No web browsing / no remote search by default.**
   * Assume offline unless RB explicitly asks for web/current info.

2. **No destructive actions unless explicitly requested.**
   * Do not delete/move/rename files unless RB says so.
   * Prefer deprecation (.bak or /deprecated/) over deletion.

3. **Do not modify files automatically unless RB enables it.**
   * Default output is diffs or full files.
   * If "apply mode" exists, it must require confirmation.

4. **Stay inside of repo root.**
   * Never traverse or write outside of repository.

5. **No secrets.**
   * Never print API keys, tokens, or .env contents.

## 3) Default Output Format (Always)

When RB asks for code changes, respond using **this exact structure**:

### A) Plan
* 3–8 bullets: what you will change and why

### B) Files to Change
* List exact repo-relative paths

### C) Changes
* Prefer **unified diffs**.
* If asked for full files, output complete file contents.

### D) Commands to Run
* Provide exact commands for lint/test/build/dev

### E) Rollback Notes
 * How to revert safely (e.g., git checkout -- <file> or revert commit)

## 4) Repo Conventions (Universal Defaults)

* Prefer **TypeScript** when available.
* Keep changes minimal and localized.
* Match existing formatting and patterns.
* Add/adjust tests when behavior changes.
* Avoid introducing new dependencies unless necessary.

## 5) Package Manager & Scripts

* Detect and use the repo's package manager:
   * pnpm if pnpm-lock.yaml exists
   * npm if package-lock.json exists
   * yarn if yarn.lock exists

Default commands (choose ones that exist):

 * pnpm lint / npm run lint / yarn lint
 * pnpm test / npm test / yarn test
 * pnpm build / npm run build / yarn build

## 6) "Ask vs Assume" Policy

* If blocked by missing info (API shape, file location, expected behavior), ask **one** short question.
* Otherwise make reasonable assumptions and clearly label them.

## 7) Search & Inspection

* Use **local search only**:

  * ripgrep for text search
  * file glob search for file discovery
  * Prefer showing:

  * file path
  * relevant snippet
  * brief interpretation

## 8) BrewVerse Style Notes (Universal)

* Preserve BrewVerse naming conventions.
* Prefer professional, clean UX defaults.
* Avoid breaking changes unless explicitly requested.

## 9) When RB Mentions "G.E.P / GROK.E.P Ready"

* Produce implementation instructions that are:
  * copy/paste ready
  * scoped to exact files
  * includes command list
  * includes acceptance checks`;

    return { content: defaultRules, source: 'built-in', priority: 10 };
  }

  static formatRulesForPrompt(rules: RuleSet[], sources: string[]): string {
    if (rules.length === 0) {
      return 'No specific rules loaded. Using default behavior.';
    }

    let prompt = '# 📋 Loaded Rules\n';

    for (let i = 0; i < rules.length; i++) {
      prompt += `**Rules from ${sources[i]} (Priority ${rules[i].priority}):**\n`;
      prompt += `${rules[i].content}\n`;
      if (i < rules.length - 1) {
        prompt += '---\n';
      }
    }

    return prompt;
  }
}
