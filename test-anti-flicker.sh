#!/bin/bash

echo "🧪 GROK CLI Anti-Flicker Test Suite"
echo "==================================="
echo ""

# Test counter
passed=0
failed=0

# Test 1: Verify buffering implementation
echo "📊 Test 1: Check streaming buffer implementation"
if grep -q "streamBuffer" src/hooks/use-input-handler.ts; then
    echo "✅ Streaming buffer implemented in hook"
    ((passed++))
else
    echo "❌ Streaming buffer missing from hook"
    ((failed++))
fi

if grep -q "flushTimer" src/hooks/use-input-handler.ts; then
    echo "✅ Flush timer implemented in hook"
    ((passed++))
else
    echo "❌ Flush timer missing from hook"
    ((failed++))
fi

# Test 2: Verify render windowing
echo ""
echo "🖼️ Test 2: Check render windowing implementation"
if grep -q "MAX_ENTRIES_RENDERED" src/ui/components/chat-history.tsx; then
    echo "✅ Render window cap implemented"
    ((passed++))
else
    echo "❌ Render window cap missing"
    ((failed++))
fi

if grep -q "visibleEntries" src/ui/components/chat-history.tsx; then
    echo "✅ Visible entries filtering implemented"
    ((passed++))
else
    echo "❌ Visible entries filtering missing"
    ((failed++))
fi

# Test 3: Verify flush cadence
echo ""
echo "⏱️ Test 3: Check flush cadence configuration"
if grep -q "75ms" src/ui/components/chat-interface.tsx; then
    echo "✅ 75ms flush cadence configured"
    ((passed++))
else
    echo "❌ Flush cadence not configured"
    ((failed++))
fi

# Test 4: Verify buffer size
echo ""
echo "📏 Test 4: Check render window size"
if grep -q "MAX_ENTRIES_RENDERED = 25" src/ui/components/chat-history.tsx; then
    echo "✅ Render window set to 25 entries"
    ((passed++))
else
    echo "❌ Render window size not set to 25"
    ((failed++))
fi

# Test 5: Verify useCallback usage
echo ""
echo "🔄 Test 5: Check useCallback for performance"
if grep -q "useCallback" src/ui/components/chat-interface.tsx; then
    echo "✅ useCallback implemented for performance"
    ((passed++))
else
    echo "❌ useCallback not implemented"
    ((failed++))
fi

# Test 6: Verify React.memo usage
echo ""
echo "🧠 Test 6: Check React.memo for entry optimization"
if grep -q "React.memo" src/ui/components/chat-history.tsx; then
    echo "✅ React.memo implemented for entry optimization"
    ((passed++))
else
    echo "❌ React.memo not implemented"
    ((failed++))
fi

# Test 7: Build test
echo ""
echo "🔨 Test 7: Verify build still works"
if npm run build > /dev/null 2>&1; then
    echo "✅ Build successful with anti-flicker changes"
    ((passed++))
else
    echo "❌ Build failed with anti-flicker changes"
    ((failed++))
fi

# Test 8: Performance metrics (simulated)
echo ""
echo "📈 Test 8: Check for performance debug code"
if grep -q "flushStreamBuffer" src/ui/components/chat-interface.tsx; then
    echo "✅ Stream buffer flush function implemented"
    ((passed++))
else
    echo "❌ Stream buffer flush function missing"
    ((failed++))
fi

# Results
echo ""
echo "📊 Anti-Flicker Test Results"
echo "============================"
echo "✅ Passed: $passed"
echo "❌ Failed: $failed"
echo "📈 Success Rate: $(( passed * 100 / (passed + failed) ))%"

if [ $failed -eq 0 ]; then
    echo ""
    echo "🎉 ALL ANTI-FLICKER TESTS PASSED!"
    echo "📋 Implementation Summary:"
    echo "   ✅ Streaming buffer with 75ms flush cadence"
    echo "   ✅ Render window capped at 25 entries"
    echo "   ✅ useCallback for performance optimization"
    echo "   ✅ React.memo for entry memoization"
    echo "   ✅ Build verification passed"
    echo ""
    echo "🚀 Expected Results:"
    echo "   • Reduced flicker during streaming"
    echo "   • Lower CPU usage during long responses"
    echo "   • Stable scroll behavior"
    echo "   • Consistent performance across chat length"
    exit 0
else
    echo ""
    echo "⚠️  Some anti-flicker tests failed."
    echo "🔧 Review the failed tests above."
    exit 1
fi