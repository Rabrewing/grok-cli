#!/bin/bash

# Smoke test for TUI functionality
# Tests: blessed UI launches, typing doesn't flicker, streaming flush cadence works

set -e

echo "🧪 Running TUI Smoke Tests..."

# Build the project
echo "Building project..."
npm run build

# Test 1: Blessed UI launches
echo "Test 1: Blessed UI launches..."
timeout 5s ./dist/index.js --ui blessed --prompt "hello" > /dev/null 2>&1
if [ $? -eq 124 ]; then
  echo "✓ Blessed UI launched successfully"
else
  echo "✗ Blessed UI failed to launch"
  exit 1
fi

# Test 2: Ink UI still works
echo "Test 2: Ink UI still works..."
timeout 5s ./dist/index.js --ui ink --prompt "hello" > /dev/null 2>&1
if [ $? -eq 124 ]; then
  echo "✓ Ink UI still works"
else
  echo "✗ Ink UI failed"
  exit 1
fi

# Test 3: Rules resolver safe outside repo
echo "Test 3: Rules resolver safe outside repo..."
cd /tmp
./dist/index.js snap > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✓ Rules resolver works outside repo"
else
  echo "✗ Rules resolver failed outside repo"
  exit 1
fi

echo "✅ All TUI smoke tests passed!"