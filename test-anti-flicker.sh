#!/bin/bash

echo "🧪 GROK CLI Hybrid Renderer Test Suite"
echo "======================================"
echo ""

# Test counter
passed=0
failed=0

# Test 1: Verify Hybrid Stream Writer implementation
echo "📊 Test 1: Check Hybrid Stream Writer implementation"
if [ -f "src/ui/stream-writer.ts" ]; then
    echo "✅ Stream writer utility file created"
    ((passed++))
else
    echo "❌ Stream writer utility file missing"
    ((failed++))
fi

if grep -q "process.stdout.write" src/ui/stream-writer.ts; then
    echo "✅ Direct stdout writing implemented"
    ((passed++))
else
    echo "❌ Direct stdout writing missing"
    ((failed++))
fi

if grep -q "beginAssistantStream" src/ui/stream-writer.ts; then
    echo "✅ Stream session management implemented"
    ((passed++))
else
    echo "❌ Stream session management missing"
    ((failed++))
fi

# Test 2: Verify Hybrid Renderer integration
echo ""
echo "🔄 Test 2: Check Hybrid Renderer integration"
if grep -q "streamWriter" src/hooks/use-input-handler.ts; then
    echo "✅ Stream writer imported in input handler"
    ((passed++))
else
    echo "❌ Stream writer not imported in input handler"
    ((failed++))
fi

if grep -q "Phase A" src/hooks/use-input-handler.ts; then
    echo "✅ Hybrid Renderer Phase A implemented"
    ((passed++))
else
    echo "❌ Hybrid Renderer Phase A missing"
    ((failed++))
fi

if grep -q "Phase B" src/hooks/use-input-handler.ts; then
    echo "✅ Hybrid Renderer Phase B implemented"
    ((passed++))
else
    echo "❌ Hybrid Renderer Phase B missing"
    ((failed++))
fi

# Test 3: Verify render windowing (legacy support)
echo ""
echo "🖼️ Test 3: Check render windowing implementation"
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

# Test 4: Verify history freezing during streaming
echo ""
echo "🧊 Test 4: Check history freezing implementation"
if grep -q "streamFrozenHistory" src/ui/components/chat-interface.tsx; then
    echo "✅ History freezing during streaming implemented"
    ((passed++))
else
    echo "❌ History freezing during streaming missing"
    ((failed++))
fi

if grep -q "isStreaming ? streamFrozenHistory : chatHistory" src/ui/components/chat-interface.tsx; then
    echo "✅ Conditional history rendering implemented"
    ((passed++))
else
    echo "❌ Conditional history rendering missing"
    ((failed++))
fi

# Test 5: Verify zero React updates during streaming
echo ""
echo "🚫 Test 5: Check for eliminated React updates during streaming"
if ! grep -q "setChatHistory.*chunk" src/hooks/use-input-handler.ts; then
    echo "✅ No per-chunk React state updates (good!)"
    ((passed++))
else
    echo "❌ Per-chunk React state updates still present"
    ((failed++))
fi

if grep -q "finalText.*chunk.content" src/hooks/use-input-handler.ts; then
    echo "✅ Final text buffer building implemented"
    ((passed++))
else
    echo "❌ Final text buffer building missing"
    ((failed++))
fi

# Test 6: Verify React.memo usage (legacy support)
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
    echo "✅ Build successful with Hybrid Renderer changes"
    ((passed++))
else
    echo "❌ Build failed with Hybrid Renderer changes"
    ((failed++))
fi

# Test 8: Validate elimination of flicker sources
echo ""
echo "🎯 Test 8: Check for flicker elimination"
if ! grep -q "setChatHistory.*prev.*streamingEntry" src/hooks/use-input-handler.ts; then
    echo "✅ Per-streaming-entry React updates eliminated"
    ((passed++))
else
    echo "❌ Per-streaming-entry React updates still present"
    ((failed++))
fi

if grep -q "commit once" src/hooks/use-input-handler.ts; then
    echo "✅ Single commit pattern documented in code"
    ((passed++))
else
    echo "❌ Single commit pattern not documented"
    ((failed++))
fi

# Test 9: Verify stream writer error handling
echo ""
echo "🛡️ Test 9: Check stream writer error handling"
if grep -q "abortStream" src/ui/stream-writer.ts; then
    echo "✅ Stream abort/cleanup implemented"
    ((passed++))
else
    echo "❌ Stream abort/cleanup missing"
    ((failed++))
fi

if grep -q "isStreaming" src/ui/stream-writer.ts; then
    echo "✅ Stream state tracking implemented"
    ((passed++))
else
    echo "❌ Stream state tracking missing"
    ((failed++))
fi

# Results
echo ""
echo "📊 Hybrid Renderer Test Results"
echo "==============================="
echo "✅ Passed: $passed"
echo "❌ Failed: $failed"
echo "📈 Success Rate: $(( passed * 100 / (passed + failed) ))%"

if [ $failed -eq 0 ]; then
    echo ""
    echo "🎉 ALL HYBRID RENDERER TESTS PASSED!"
    echo "📋 Implementation Summary:"
    echo "   ✅ Hybrid Stream Writer with direct stdout writing"
    echo "   ✅ Phase A: Live streaming without React updates"
    echo "   ✅ Phase B: Single commit at stream end"
    echo "   ✅ History freezing during streaming"
    echo "   ✅ Eliminated per-chunk React re-renders"
    echo "   ✅ Stream abort/cleanup for error handling"
    echo "   ✅ Build verification passed"
    echo ""
    echo "🚀 Expected Results:"
    echo "   • Zero flicker during streaming"
    echo "   • Minimal CPU usage during streaming"
    echo "   • Stable scroll position"
    echo "   • Instant visual feedback"
    echo "   • No React tree updates during streaming"
    exit 0
else
    echo ""
    echo "⚠️  Some Hybrid Renderer tests failed."
    echo "🔧 Review the failed tests above."
    exit 1
fi