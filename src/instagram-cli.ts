#!/usr/bin/env node

/**
 * Instagram CLI - Command line interface for Instagram operations
 * Usage: node instagram-cli.js <command> [options]
 */

const { WhatsAppMonitoringApp } = require('../index.js');
const config = require('../config.js');

const app = new WhatsAppMonitoringApp();

// Define commands with proper typing
const commands = {
  help: {
    description: 'Show help information',
    usage: 'node instagram-cli.js help',
    execute: () => {
      console.log('📸 Instagram CLI - Command Line Interface');
      console.log('');
      console.log('Available commands:');
      console.log('');
      console.log('  help                    - Show this help message');
      console.log('  generate <propertyId>   - Generate Instagram carousel for a property');
      console.log('  publish <carouselId>   - Publish a carousel to Instagram');
      console.log('  analytics              - Get Instagram analytics');
      console.log('  batch-publish          - Batch publish all unpublished properties');
      console.log('  schedule <carouselId> <date> - Schedule a carousel for future publishing');
      console.log('  list                   - List all carousels');
      console.log('');
      console.log('Examples:');
      console.log('  node instagram-cli.js generate prop_123456789');
      console.log('  node instagram-cli.js publish carousel_123456789');
      console.log('  node instagram-cli.js analytics');
      console.log('  node instagram-cli.js batch-publish');
    }
  },

  generate: {
    description: 'Generate Instagram carousel for a property',
    usage: 'node instagram-cli.js generate <propertyId>',
    execute: async (propertyId) => {
      if (!propertyId) {
        console.error('❌ Property ID is required');
        console.log('Usage: node instagram-cli.js generate <propertyId>');
        process.exit(1);
      }

      console.log(`🎨 Generating Instagram carousel for property: ${propertyId}`);
      
      try {
        const result = await app.generateInstagramCarousel(propertyId);
        
        if (result.success) {
          console.log('✅ Carousel generated successfully!');
          console.log('📋 Carousel ID:', result.carousel_id);
          console.log('💡 Use "publish" command to publish to Instagram');
        } else {
          console.error('❌ Failed to generate carousel:', result.error);
        }
      } catch (error) {
        console.error('❌ Error generating carousel:', error.message);
      }
    }
  },

  publish: {
    description: 'Publish a carousel to Instagram',
    usage: 'node instagram-cli.js publish <carouselId>',
    execute: async (carouselId) => {
      if (!carouselId) {
        console.error('❌ Carousel ID is required');
        console.log('Usage: node instagram-cli.js publish <carouselId>');
        process.exit(1);
      }

      console.log(`📤 Publishing carousel to Instagram: ${carouselId}`);
      
      try {
        const result = await app.publishInstagramCarousel(carouselId);
        
        if (result.success) {
          console.log('✅ Carousel published successfully!');
          console.log('🔗 Post URL:', result.post.permalink);
          console.log('📅 Published at:', result.post.published_at);
        } else {
          console.error('❌ Failed to publish carousel:', result.error);
        }
      } catch (error) {
        console.error('❌ Error publishing carousel:', error.message);
      }
    }
  },

  analytics: {
    description: 'Get Instagram analytics',
    usage: 'node instagram-cli.js analytics',
    execute: async () => {
      console.log('📊 Getting Instagram analytics...');
      
      try {
        const result = await app.getInstagramAnalytics();
        
        if (result.success) {
          const analytics = result.analytics;
          
          console.log('📈 Instagram Analytics');
          console.log('====================');
          console.log(`🎯 Total Carousels: ${analytics.total_carousels}`);
          console.log(`✅ Published: ${analytics.published_carousels}`);
          console.log(`⏰ Scheduled: ${analytics.scheduled_carousels}`);
          console.log(`📝 Draft: ${analytics.draft_carousels}`);
          console.log('');
          
          if (analytics.recent_posts.length > 0) {
            console.log('📱 Recent Posts:');
            console.log('================');
            analytics.recent_posts.forEach((post, index) => {
              console.log(`${index + 1}. ${post.permalink}`);
              console.log(`   Published: ${new Date(post.published_at).toLocaleDateString()}`);
              console.log(`   Caption: ${post.caption.substring(0, 100)}...`);
              console.log('');
            });
          }
        } else {
          console.error('❌ Failed to get analytics:', result.error);
        }
      } catch (error) {
        console.error('❌ Error getting analytics:', error.message);
      }
    }
  },

  'batch-publish': {
    description: 'Batch publish all unpublished properties',
    usage: 'node instagram-cli.js batch-publish',
    execute: async () => {
      console.log('🚀 Starting batch Instagram publish...');
      
      try {
        const result = await app.batchPublishInstagram();
        
        if (result.success) {
          console.log('✅ Batch publish completed successfully!');
          console.log(`📤 Published ${result.published_posts.length} posts`);
          
          result.published_posts.forEach((post, index) => {
            console.log(`${index + 1}. ${post.permalink}`);
          });
        } else {
          console.error('❌ Batch publish failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Error in batch publish:', error.message);
      }
    }
  },

  list: {
    description: 'List all carousels',
    usage: 'node instagram-cli.js list',
    execute: async () => {
      console.log('📋 Listing all carousels...');
      
      try {
        // This would need to be implemented in the app
        console.log('ℹ️  List functionality would be implemented here');
        console.log('💡 Use analytics command to see published carousels');
      } catch (error) {
        console.error('❌ Error listing carousels:', error.message);
      }
    }
  },

  schedule: {
    description: 'Schedule a carousel for future publishing',
    usage: 'node instagram-cli.js schedule <carouselId> <date>',
    execute: async (carouselId, date) => {
      if (!carouselId || !date) {
        console.error('❌ Carousel ID and date are required');
        console.log('Usage: node instagram-cli.js schedule <carouselId> <date>');
        console.log('Date format: YYYY-MM-DD HH:MM:SS');
        process.exit(1);
      }

      console.log(`⏰ Scheduling carousel ${carouselId} for: ${date}`);
      
      try {
        // This would need to be implemented in the app
        console.log('ℹ️  Scheduling functionality would be implemented here');
      } catch (error) {
        console.error('❌ Error scheduling carousel:', error.message);
      }
    }
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command && commands[command]) {
  const commandFunc = commands[command];
  commandFunc.execute(...args.slice(1));
} else {
  console.log('❌ Unknown command:', command);
  console.log('');
  commands.help.execute();
  process.exit(1);
}