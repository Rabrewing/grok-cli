/**
 * Simple diff generator for file changes
 */
export function generateSimpleDiff(
  oldContent: string,
  newContent: string,
  filePath: string
): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const diffLines: string[] = [
    `--- a/${filePath}`,
    `+++ b/${filePath}`
  ];

  let added = 0;
  let removed = 0;

  // Simple line-by-line diff
  const maxLines = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined && newLine !== undefined) {
      diffLines.push(`+${newLine}`);
      added++;
    } else if (oldLine !== undefined && newLine === undefined) {
      diffLines.push(`-${oldLine}`);
      removed++;
    } else if (oldLine !== newLine) {
      if (oldLine !== undefined) {
        diffLines.push(`-${oldLine}`);
        removed++;
      }
      if (newLine !== undefined) {
        diffLines.push(`+${newLine}`);
        added++;
      }
    }
  }

  return diffLines.join('\n');
}

export function calculateChanges(oldContent: string, newContent: string): { added: number; removed: number } {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  let added = 0;
  let removed = 0;

  const maxLines = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined && newLine !== undefined) {
      added++;
    } else if (oldLine !== undefined && newLine === undefined) {
      removed++;
    } else if (oldLine !== newLine) {
      if (oldLine !== undefined) removed++;
      if (newLine !== undefined) added++;
    }
  }

  return { added, removed };
}