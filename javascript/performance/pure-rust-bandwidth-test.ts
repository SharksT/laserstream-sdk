import { LaserstreamClient, CommitmentLevel } from '../index';
import type { SubscribeUpdate } from '../index';

const config = require('../test-config');

async function getCurrentSlot(apiKey: string): Promise<number> {
  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getSlot'
    })
  });
  const data = await response.json();
  return data.result;
}

async function main() {
  // Get current slot and calculate replay slot (2000 slots back for more data)
  const currentSlot = await getCurrentSlot(config.laserstreamProduction.apiKey);
  const replaySlot = currentSlot - 2000;
  
  console.log(`Starting PURE RUST measurement from slot ${replaySlot} (current: ${currentSlot})`);
  console.log('🚀 Measuring pure object count (NO JSON serialization)');
  
  // Create Laserstream client (Rust-based decoding)
  const client = new LaserstreamClient(
    config.laserstreamProduction.endpoint, 
    config.laserstreamProduction.apiKey
  );
  
  // Create comprehensive subscription request
  const subscribeRequest = {
    accounts: {
      "all-accounts": {
        account: [],
        owner: [],
        filters: []
      }
    },
    slots: {
      "all-slots": {
        filterByCommitment: false
      }
    },
    transactions: {
      "all-transactions": {
        accountInclude: [],
        accountExclude: [],
        accountRequired: [],
        vote: false,
        failed: false
      }
    },
    transactionsStatus: {},
    blocks: {},
    blocksMeta: {
      "all-block-meta": {}
    },
    entry: {
      "all-entries": {}
    },
    commitment: CommitmentLevel.Processed,
    accountsDataSlice: [],
    fromSlot: replaySlot
  };
  
  // Bandwidth tracking
  let messageCount = 0;
  let lastCheckpoint = Date.now();
  const testDuration = 10; // seconds
  const checkpointInterval = 2; // seconds
  const numCheckpoints = testDuration / checkpointInterval;
  let checkpointNum = 1;
  
  console.log(`Testing for ${testDuration}s with checkpoints every ${checkpointInterval}s`);
  console.log('Target: 200k+ msgs/sec (eliminate JSON.stringify bottleneck)');
  
  try {
    await client.subscribe(subscribeRequest, (error: Error | null, update: SubscribeUpdate) => {
      if (error) {
        console.error('Stream error:', error);
        return;
      }
      
      // Count ONLY messages - no JSON serialization overhead
      messageCount++;
      
      // Checkpoint reporting
      const now = Date.now();
      if (now - lastCheckpoint > checkpointInterval * 1000) {
        const elapsed = (now - lastCheckpoint) / 1000;
        const messagesPerSec = messageCount / elapsed;
        
        console.log(`🚀 PURE Checkpoint ${checkpointNum}/${numCheckpoints}: ${messagesPerSec.toFixed(0)} msgs/s (NO byte measurement)`);
        
        // Reset counters
        messageCount = 0;
        lastCheckpoint = now;
        checkpointNum++;
        
        if (checkpointNum > numCheckpoints) {
          console.log('✅ Pure Rust measurement completed');
          process.exit(0);
        }
      }
    });
    
    console.log('✅ Pure measurement started');
    
    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Subscription failed:', error);
    process.exit(1);
  }
}

main().catch(console.error); 