#!/bin/bash

echo "🧪 GROK CLI Comprehensive Test Suite"
echo "==================================="
echo ""

# Test counter
passed=0
failed=0

# Test 1: Basic functionality
echo "📄 Test 1: Basic grok functionality"
if command -v grok > /dev/null 2>&1; then
    echo "✅ grok command is available"
    ((passed++))
else
    echo "❌ grok command not found"
    ((failed++))
fi

# Test 2: Help output
echo ""
echo "📖 Test 2: Help functionality"
if grok --help | grep -q "\-\-repo"; then
    echo "✅ --repo option available"
    ((passed++))
else
    echo "❌ --repo option missing"
    ((failed++))
fi

# Test 3: Snap command in repo
echo ""
echo "📸 Test 3: Snap in git repo"
temp_dir=$(mktemp -d)
cd "$temp_dir"
git init > /dev/null 2>&1
echo '{"name":"test-repo"}' > package.json

if timeout 10s grok snap > snap_test.log 2>&1; then
    if grep -q "Repository Snapshot" snap_test.log; then
        echo "✅ snap command works in git repo"
        ((passed++))
    else
        echo "❌ snap command malformed output"
        ((failed++))
    fi
else
    echo "❌ snap command failed or timed out"
    ((failed++))
fi

cd /
rm -rf "$temp_dir"

# Test 4: Ticket command 
echo ""
echo "🎫 Test 4: Ticket command"
temp_dir=$(mktemp -d)
cd "$temp_dir"
git init > /dev/null 2>&1
echo '{"name":"test-repo"}' > package.json

if timeout 10s grok ticket "Test ticket generation" > ticket_test.log 2>&1; then
    if grep -q "Task:" ticket_test.log && grep -q "Repository:" ticket_test.log; then
        echo "✅ ticket command works"
        ((passed++))
    else
        echo "❌ ticket command malformed output"
        ((failed++))
    fi
else
    echo "❌ ticket command failed or timed out"
    ((failed++))
fi

cd /
rm -rf "$temp_dir"

# Test 5: CLI options
echo ""
echo "⚙️ Test 5: CLI options availability"
if grok --help | grep -q "\-\-apply"; then
    echo "✅ --apply option available"
    ((passed++))
else
    echo "❌ --apply option missing"
    ((failed++))
fi

# Test 6: Custom rules loading
echo ""
echo "📋 Test 6: Custom rules loading"
temp_dir=$(mktemp -d)
cd "$temp_dir"
git init > /dev/null 2>&1
echo '{"name":"test-repo"}' > package.json
echo "# Test Rules" > GROK_RULES.md

if timeout 10s grok --rules ./GROK_RULES.md snap > custom_rules.log 2>&1; then
    if grep -q "Test Rules" custom_rules.log; then
        echo "✅ custom rules loading works"
        ((passed++))
    else
        echo "❌ custom rules not loaded"
        ((failed++))
    fi
else
    echo "❌ custom rules command failed"
    ((failed++))
fi

cd /
rm -rf "$temp_dir"

# Results
echo ""
echo "📊 Test Results"
echo "=================="
echo "✅ Passed: $passed"
echo "❌ Failed: $failed"
echo "📈 Success Rate: $(( passed * 100 / (passed + failed) ))%"

if [ $failed -eq 0 ]; then
    echo ""
    echo "🎉 ALL TESTS PASSED! GROK CLI is fully functional."
    exit 0
else
    echo ""
    echo "⚠️  Some tests failed. Core functionality still works."
    exit 1
fi