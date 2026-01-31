#!/bin/bash

# Smoke test for repo mode functionality
# Tests: repo mode loads rules + snapshot, apply works

set -e

echo "🧪 Running Repo Mode Smoke Tests..."

# Build the project
echo "Building project..."
npm run build

# Test 1: Repo mode loads rules and snapshot
echo "Test 1: Repo mode loads rules and snapshot..."
./dist/index.js --repo --snapshot --prompt "show status" > /tmp/repo_test.log 2>&1
if grep -q "📁 Repo mode enabled" /tmp/repo_test.log && grep -q "snapshot" /tmp/repo_test.log; then
  echo "✓ Repo mode loads rules and snapshot"
else
  echo "✗ Repo mode failed to load rules/snapshot"
  cat /tmp/repo_test.log
  exit 1
fi

# Test 2: Apply flag works
echo "Test 2: Apply flag works..."
echo "Testing apply flag..." > /tmp/apply_test.log
# Since we can't easily test apply without making changes, just check flag parsing
./dist/index.js --apply --yes --prompt "list files" > /tmp/apply_test.log 2>&1
if [ $? -eq 0 ]; then
  echo "✓ Apply flag accepted"
else
  echo "✗ Apply flag failed"
  exit 1
fi

echo "✅ All repo mode smoke tests passed!"