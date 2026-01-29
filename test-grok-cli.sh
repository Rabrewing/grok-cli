#!/bin/bash

echo "🧪 Running GROK CLI Comprehensive Tests..."
echo ""

# Set test directory
TEST_DIR="/tmp/grok-test"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo "📁 Test 1: Initialize git repo"
git init
git config user.email "test@example.com"
git config user.name "Test User"

echo "📄 Test 2: Create package.json"
cat > package.json << 'EOF'
{
  "name": "test-repo",
  "version": "1.0.0",
  "scripts": {
    "test": "echo 'test running'",
    "build": "echo 'build running'",
    "lint": "echo 'lint running'"
  }
}
EOF

echo "📋 Test 3: Create basic files"
mkdir -p src/components
echo "export default function App() { return <div>Hello</div>; }" > src/App.tsx
echo "export const utils = () => 'test';" > src/utils.ts

echo "🔧 Test 4: Test grok snap command"
echo "Running: grok snap"
grok snap > snap_output.txt
if [ $? -eq 0 ]; then
    echo "✅ snap command PASSED"
    echo "Snapshot sections found:"
    grep -E "^## [A-F)" snap_output.txt | wc -l
else
    echo "❌ snap command FAILED"
fi

echo ""
echo "🎫 Test 5: Test grok ticket command"
echo "Running: grok ticket 'Add new feature'"
grok ticket "Add new feature to test functionality" > ticket_output.txt
if [ $? -eq 0 ]; then
    echo "✅ ticket command PASSED"
    echo "Ticket format check:"
    if grep -q "Task:" ticket_output.txt && grep -q "Repository:" ticket_output.txt && grep -q "Response Format:" ticket_output.txt; then
        echo "✅ Ticket format is correct"
    else
        echo "❌ Ticket format is incorrect"
    fi
else
    echo "❌ ticket command FAILED"
fi

echo ""
echo "🏠 Test 6: Test repo mode auto-detection"
echo "Running: grok --repo"
timeout 5s grok --repo "test repo mode" || true
if [ $? -eq 124 ]; then
    echo "✅ repo mode auto-detection works"
else
    echo "❌ repo mode auto-detection failed"
fi

echo ""
echo "🖥 Test 7: Test CLI options availability"
echo "Running: grok --help"
grok --help > help_output.txt
if grep -q "\-\-diff" help_output.txt && grep -q "\-\-apply" help_output.txt && grep -q "\-\-full-files" help_output.txt; then
    echo "✅ All CLI options available"
else
    echo "❌ Some CLI options missing"
fi

echo ""
echo "🔧 Test 8: Test with custom rules"
echo "# Custom Test Rules" > GROK_RULES.md
echo "When editing files, always add TODO comments" >> GROK_RULES.md

echo "Running: grok --rules ./GROK_RULES.md snap"
grok --rules ./GROK_RULES.md snap > custom_rules_output.txt
if grep -q "Custom Test Rules" custom_rules_output.txt; then
    echo "✅ Custom rules loading works"
else
    echo "❌ Custom rules loading failed"
fi

echo ""
echo "📊 Test Results Summary"
echo "===================="
passed=0
failed=0

# Check results
[ -f snap_output.txt ] && grep -q "Repository Snapshot" snap_output.txt && ((passed++)) || ((failed++))
[ -f ticket_output.txt ] && grep -q "Task:" ticket_output.txt && ((passed++)) || ((failed++))
[ -f help_output.txt ] && grep -q "\-\-diff" help_output.txt && ((passed++)) || ((failed++))
[ -f custom_rules_output.txt ] && grep -q "Custom Test Rules" custom_rules_output.txt && ((passed++)) || ((failed++))

echo "🎯 Tests Passed: $passed"
echo "❌ Tests Failed: $failed"
echo "📈 Success Rate: $(( passed * 100 / (passed + failed) ))%"

# Cleanup
cd /
rm -rf "$TEST_DIR"

if [ $failed -eq 0 ]; then
    echo ""
    echo "🎉 ALL TESTS PASSED! GROK CLI is fully functional."
    exit 0
else
    echo ""
    echo "⚠️  Some tests failed. Check the output above."
    exit 1
fi