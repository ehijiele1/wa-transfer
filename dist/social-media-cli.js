#!/usr/bin/env node
"use strict";
const { WhatsAppMonitoringApp } = require('../index.js');
const config = require('../config.js');
const app = new WhatsAppMonitoringApp();
const commands = {
    help: {
        description: 'Show help information',
        usage: 'node social-media-cli.js help',
        execute: () => {
            console.log('📱 Social Media CLI - Command Line Interface');
            console.log('');
            console.log('Available commands:');
            console.log('');
            console.log('  help                           - Show this help message');
            console.log('  publish <platform> [options]  - Publish content to platform');
            console.log('  schedule <platform> <date>    - Schedule content for platform');
            console.log('  analytics [platform]           - Get platform analytics');
            console.log('  dashboard                     - Get social media dashboard');
            console.log('  queue <action> [platform]     - Manage content queues');
            console.log('  ab-test <action> [testId]     - Manage A/B tests');
            console.log('  cross-platform <platforms>    - Publish to multiple platforms');
            console.log('');
            console.log('Platforms: facebook, twitter, linkedin');
            console.log('');
            console.log('Examples:');
            console.log('  node social-media-cli.js publish facebook');
            console.log('  node social-media-cli.js analytics facebook');
            console.log('  node social-media-cli.js dashboard');
            console.log('  node social-media-cli.js queue create facebook');
            console.log('  node social-media-cli.js ab-test create');
        }
    },
    publish: {
        description: 'Publish content to a social media platform',
        usage: 'node social-media-cli.js publish <platform> [options]',
        execute: async (platform) => {
            if (!platform) {
                console.error('❌ Platform is required');
                console.log('Usage: node social-media-cli.js publish <platform>');
                console.log('Platforms: facebook, twitter, linkedin');
                process.exit(1);
            }
            console.log(`📤 Publishing to ${platform}...`);
            try {
                const content = {
                    title: 'Amazing Property Available',
                    content: 'Check out this incredible property! Perfect for families and investors alike.',
                    hashtags: ['#realestate', '#homesforsale', '#dreamhome'],
                    mediaUrls: [],
                };
                const result = await app.publishToSocialMedia(content, [platform]);
                if (result.success) {
                    console.log('✅ Content published successfully!');
                    console.log('📊 Result:', JSON.stringify(result, null, 2));
                }
                else {
                    console.error('❌ Failed to publish content:', result.error);
                }
            }
            catch (error) {
                console.error('❌ Error publishing content:', error.message);
            }
        }
    },
    schedule: {
        description: 'Schedule content for a social media platform',
        usage: 'node social-media-cli.js schedule <platform> <date>',
        execute: async (platform, date) => {
            if (!platform || !date) {
                console.error('❌ Platform and date are required');
                console.log('Usage: node social-media-cli.js schedule <platform> <date>');
                console.log('Date format: YYYY-MM-DD HH:MM:SS');
                process.exit(1);
            }
            console.log(`📅 Scheduling for ${platform} at ${date}...`);
            try {
                const content = {
                    title: 'Scheduled Property Post',
                    content: 'This property is scheduled for future publication!',
                    hashtags: ['#realestate', '#property', '#investment'],
                    mediaUrls: [],
                };
                const scheduleDate = new Date(date);
                if (isNaN(scheduleDate.getTime())) {
                    throw new Error('Invalid date format');
                }
                const result = await app.publishToSocialMedia(content, [platform], scheduleDate);
                if (result.success) {
                    console.log('✅ Content scheduled successfully!');
                    console.log('📅 Scheduled for:', scheduleDate.toLocaleString());
                    console.log('📊 Result:', JSON.stringify(result, null, 2));
                }
                else {
                    console.error('❌ Failed to schedule content:', result.error);
                }
            }
            catch (error) {
                console.error('❌ Error scheduling content:', error.message);
            }
        }
    },
    analytics: {
        description: 'Get platform analytics',
        usage: 'node social-media-cli.js analytics [platform]',
        execute: async (platform) => {
            console.log(`📊 Getting analytics${platform ? ` for ${platform}` : ' for all platforms'}...`);
            try {
                const dateRange = {
                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    end: new Date(),
                };
                const result = await app.getSocialMediaAnalytics(platform, dateRange);
                if (result.success) {
                    console.log('✅ Analytics retrieved successfully!');
                    console.log('📊 Analytics Data:', JSON.stringify(result, null, 2));
                }
                else {
                    console.error('❌ Failed to get analytics:', result.error);
                }
            }
            catch (error) {
                console.error('❌ Error getting analytics:', error.message);
            }
        }
    },
    dashboard: {
        description: 'Get social media dashboard summary',
        usage: 'node social-media-cli.js dashboard',
        execute: async () => {
            console.log('📊 Generating social media dashboard...');
            try {
                const result = await app.getSocialMediaDashboard();
                if (result.success) {
                    console.log('✅ Dashboard generated successfully!');
                    console.log('📊 Dashboard Summary:');
                    console.log('====================');
                    console.log(JSON.stringify(result, null, 2));
                }
                else {
                    console.error('❌ Failed to generate dashboard:', result.error);
                }
            }
            catch (error) {
                console.error('❌ Error generating dashboard:', error.message);
            }
        }
    },
    queue: {
        description: 'Manage content queues',
        usage: 'node social-media-cli.js queue <action> [platform]',
        execute: async (action, platform) => {
            if (!action) {
                console.error('❌ Action is required');
                console.log('Usage: node social-media-cli.js queue <action> [platform]');
                console.log('Actions: create, status, pause, resume, clear');
                process.exit(1);
            }
            console.log(`📦 Queue action: ${action}${platform ? ` for ${platform}` : ''}`);
            try {
                switch (action) {
                    case 'create':
                        if (!platform) {
                            console.error('❌ Platform is required for create action');
                            process.exit(1);
                        }
                        const createResult = await app.createSocialMediaQueue(platform, 'medium');
                        if (createResult.success) {
                            console.log('✅ Queue created successfully!');
                            console.log('📊 Result:', JSON.stringify(createResult, null, 2));
                        }
                        else {
                            console.error('❌ Failed to create queue:', createResult.error);
                        }
                        break;
                    case 'status':
                        const statusResult = await app.getSocialMediaQueueStatus();
                        if (statusResult.success) {
                            console.log('✅ Queue status retrieved successfully!');
                            console.log('📊 Status:', JSON.stringify(statusResult, null, 2));
                        }
                        else {
                            console.error('❌ Failed to get queue status:', statusResult.error);
                        }
                        break;
                    case 'pause':
                    case 'resume':
                    case 'clear':
                        if (!platform) {
                            console.error('❌ Platform is required for this action');
                            process.exit(1);
                        }
                        console.log(`ℹ️  ${action} action for ${platform} would be implemented here`);
                        break;
                    default:
                        console.error(`❌ Unknown action: ${action}`);
                        console.log('Available actions: create, status, pause, resume, clear');
                }
            }
            catch (error) {
                console.error('❌ Error managing queue:', error.message);
            }
        }
    },
    'ab-test': {
        description: 'Manage A/B tests',
        usage: 'node social-media-cli.js ab-test <action> [testId]',
        execute: async (action, testId) => {
            if (!action) {
                console.error('❌ Action is required');
                console.log('Usage: node social-media-cli.js ab-test <action> [testId]');
                console.log('Actions: create, start, stop, results, recommendations');
                process.exit(1);
            }
            console.log(`🧪 A/B Test action: ${action}${testId ? ` for test ${testId}` : ''}`);
            try {
                switch (action) {
                    case 'create':
                        const testConfig = {
                            name: 'Sample A/B Test',
                            description: 'Testing different content approaches',
                            platform: 'facebook',
                            variants: [
                                {
                                    content: {
                                        title: 'Variant A - Direct Approach',
                                        content: 'Check out this amazing property!',
                                        hashtags: ['#realestate', '#homesforsale'],
                                    }
                                },
                                {
                                    content: {
                                        title: 'Variant B - Benefit Approach',
                                        content: 'Find your dream home with amazing features!',
                                        hashtags: ['#dreamhome', '#property'],
                                    }
                                }
                            ]
                        };
                        const createResult = await app.createABTest(testConfig);
                        if (createResult.success) {
                            console.log('✅ A/B test created successfully!');
                            console.log('📊 Test ID:', createResult.id);
                            console.log('📊 Result:', JSON.stringify(createResult, null, 2));
                        }
                        else {
                            console.error('❌ Failed to create A/B test:', createResult.error);
                        }
                        break;
                    case 'start':
                        if (!testId) {
                            console.error('❌ Test ID is required for start action');
                            process.exit(1);
                        }
                        const startResult = await app.startABTest(testId);
                        if (startResult.success) {
                            console.log('✅ A/B test started successfully!');
                            console.log('📊 Result:', JSON.stringify(startResult, null, 2));
                        }
                        else {
                            console.error('❌ Failed to start A/B test:', startResult.error);
                        }
                        break;
                    case 'stop':
                        if (!testId) {
                            console.error('❌ Test ID is required for stop action');
                            process.exit(1);
                        }
                        const stopResult = await app.stopABTest(testId);
                        if (stopResult.success) {
                            console.log('✅ A/B test stopped successfully!');
                            console.log('📊 Result:', JSON.stringify(stopResult, null, 2));
                        }
                        else {
                            console.error('❌ Failed to stop A/B test:', stopResult.error);
                        }
                        break;
                    case 'results':
                        if (!testId) {
                            console.error('❌ Test ID is required for results action');
                            process.exit(1);
                        }
                        const resultsResult = await app.getABTestResults(testId);
                        if (resultsResult.success) {
                            console.log('✅ A/B test results retrieved successfully!');
                            console.log('📊 Results:', JSON.stringify(resultsResult, null, 2));
                        }
                        else {
                            console.error('❌ Failed to get A/B test results:', resultsResult.error);
                        }
                        break;
                    case 'recommendations':
                        if (!testId) {
                            console.error('❌ Test ID is required for recommendations action');
                            process.exit(1);
                        }
                        const recResult = await app.getTestRecommendations(testId);
                        if (recResult.success) {
                            console.log('✅ Recommendations retrieved successfully!');
                            console.log('📊 Recommendations:', JSON.stringify(recResult, null, 2));
                        }
                        else {
                            console.error('❌ Failed to get recommendations:', recResult.error);
                        }
                        break;
                    default:
                        console.error(`❌ Unknown action: ${action}`);
                        console.log('Available actions: create, start, stop, results, recommendations');
                }
            }
            catch (error) {
                console.error('❌ Error managing A/B test:', error.message);
            }
        }
    },
    'cross-platform': {
        description: 'Publish to multiple platforms simultaneously',
        usage: 'node social-media-cli.js cross-platform <platforms>',
        execute: async (platforms) => {
            if (!platforms) {
                console.error('❌ Platforms are required');
                console.log('Usage: node social-media-cli.js cross-platform <platforms>');
                console.log('Example: facebook,twitter,linkedin');
                process.exit(1);
            }
            const platformArray = platforms.split(',');
            console.log(`🌐 Cross-platform publishing to: ${platformArray.join(', ')}`);
            try {
                const content = {
                    title: 'Cross-Platform Property Post',
                    content: 'Amazing property available across multiple platforms!',
                    hashtags: ['#realestate', '#property', '#investment'],
                    mediaUrls: [],
                };
                const result = await app.publishToSocialMedia(content, platformArray);
                if (result.success) {
                    console.log('✅ Cross-platform publishing completed successfully!');
                    console.log('📊 Results by platform:');
                    result.results.forEach((platformResult, index) => {
                        console.log(`\n${index + 1}. ${platformResult.platform}:`);
                        if (platformResult.success) {
                            console.log('   ✅ Success');
                            console.log('   📊 Result:', JSON.stringify(platformResult.result, null, 2));
                        }
                        else {
                            console.log('   ❌ Failed:', platformResult.error);
                        }
                    });
                }
                else {
                    console.error('❌ Cross-platform publishing failed:', result.error);
                }
            }
            catch (error) {
                console.error('❌ Error in cross-platform publishing:', error.message);
            }
        }
    }
};
const args = process.argv.slice(2);
const command = args[0];
if (command && commands[command]) {
    const commandFunc = commands[command];
    const argsArray = args.slice(1);
    commandFunc.execute(...argsArray);
}
else {
    console.log('❌ Unknown command:', command);
    console.log('');
    commands.help.execute();
    process.exit(1);
}
//# sourceMappingURL=social-media-cli.js.map