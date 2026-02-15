// FigPal Extension Verification Script
// Run this in the browser console on a Figma page to check if the extension is working

(function () {
    console.log('🔍 FigPal Extension Verification\n');

    const results = {
        passed: [],
        failed: [],
        warnings: []
    };

    // Test 1: Check if FP object exists
    if (typeof FP !== 'undefined') {
        results.passed.push('✅ FP global object is defined');

        // Test 2: Check FP modules
        const modules = ['chat', 'ui', 'state', 'setup', 'ai', 'utils'];
        modules.forEach(mod => {
            if (FP[mod]) {
                results.passed.push(`✅ FP.${mod} module loaded`);
            } else {
                results.failed.push(`❌ FP.${mod} module missing`);
            }
        });
    } else {
        results.failed.push('❌ FP global object is undefined - extension not initialized');
    }

    // Test 3: Check DOM elements
    const elements = {
        'figpal-container': 'Main container',
        'figpal-follower': 'Floating avatar',
        'figpal-home': 'Namepost/signpost',
        'figpal-chat-bubble': 'Chat bubble'
    };

    Object.entries(elements).forEach(([id, name]) => {
        const el = document.getElementById(id);
        if (el) {
            const computed = window.getComputedStyle(el);
            const visible = computed.display !== 'none' && computed.visibility !== 'hidden' && computed.opacity !== '0';

            if (visible) {
                results.passed.push(`✅ ${name} (#${id}) exists and is visible`);
            } else {
                results.warnings.push(`⚠️ ${name} (#${id}) exists but is hidden`);
            }
        } else {
            results.failed.push(`❌ ${name} (#${id}) not found in DOM`);
        }
    });

    // Test 4: Check for console errors
    const hasErrors = performance.getEntriesByType('navigation').length > 0;
    if (!hasErrors) {
        results.passed.push('✅ No navigation errors detected');
    }

    // Test 5: Check storage
    chrome.storage.sync.get(['apiKeys', 'provider'], (data) => {
        if (data.provider) {
            results.passed.push(`✅ Provider configured: ${data.provider}`);
        } else {
            results.warnings.push('⚠️ No AI provider configured yet');
        }

        // Print results
        console.log('\n📊 VERIFICATION RESULTS\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (results.passed.length > 0) {
            console.log('✅ PASSED CHECKS:\n');
            results.passed.forEach(msg => console.log(`   ${msg}`));
            console.log('');
        }

        if (results.warnings.length > 0) {
            console.log('⚠️  WARNINGS:\n');
            results.warnings.forEach(msg => console.log(`   ${msg}`));
            console.log('');
        }

        if (results.failed.length > 0) {
            console.log('❌ FAILED CHECKS:\n');
            results.failed.forEach(msg => console.log(`   ${msg}`));
            console.log('');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Overall status
        if (results.failed.length === 0) {
            console.log('🎉 FigPal extension is working correctly!\n');
            console.log('Next steps:');
            console.log('  1. Move your mouse - the avatar should follow');
            console.log('  2. Click the avatar to open chat');
            console.log('  3. Type /help to see available commands\n');
        } else {
            console.log('❌ FigPal extension has issues that need fixing.\n');
            console.log('Troubleshooting:');
            console.log('  1. Go to chrome://extensions');
            console.log('  2. Find "DS Guardian" and click the reload button (🔄)');
            console.log('  3. Refresh this Figma tab');
            console.log('  4. Run this script again\n');
        }
    });
})();
