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
  // Copy main.rs approach exactly
  const apiKey = config.laserstreamProduction.apiKey;
  const endpointUrl = config.laserstreamProduction.endpoint;
  
  // Get current slot and calculate replay slot (same as main.rs: slot - 300)
  const slot = await getCurrentSlot(apiKey);
  const replaySlot = slot - 300;
  
  console.log(`Current slot: ${slot}, Replay slot: ${replaySlot}`);
  
  // Create comprehensive subscribe request (copying main.rs filters exactly)
  const subscribeRequest = {
    accounts: {
      "": {
        account: [],
        owner: [],
        filters: []
      }
    },
    slots: {
      "": {
        filterByCommitment: false,
        interslotUpdates: true
      }
    },
    transactions: {
      "": {
        accountInclude: [],
        accountExclude: [],
        accountRequired: [],
        vote: undefined,
        failed: undefined
      }
    },
    transactionsStatus: {},
    blocks: {},
    blocksMeta: {
      "": {}
    },
    entry: {
      "": {}
    },
    commitment: CommitmentLevel.Processed,
    accountsDataSlice: [],
    ping: undefined,
    fromSlot: replaySlot
  };
  
  const client = new LaserstreamClient(endpointUrl, apiKey);
  
  // Message throughput measurement (no processing overhead)
  let messageCount = 0;
  let lastCheckpoint = Date.now();
  const testDuration = 10; // seconds
  const checkpointInterval = 2; // seconds  
  const numCheckpoints = testDuration / checkpointInterval;
  let checkpointNum = 1;
  
  console.log("Connecting and subscribing...");
  console.log(`Starting message throughput test for ${testDuration}s with checkpoints every ${checkpointInterval}s`);
  console.log("🎯 TARGET: 200k+ msgs/sec (eliminate all processing overhead)");
  
  try {
    await client.subscribe(subscribeRequest, (error: Error | null, update: SubscribeUpdate) => {
      if (error) {
        console.error('Stream error:', error);
        return;
      }
      
      // Count messages only (no processing overhead)
      messageCount++;
      
      // Checkpoint reporting
      const now = Date.now();
      if (now - lastCheckpoint > checkpointInterval * 1000) {
        const elapsedSecs = (now - lastCheckpoint) / 1000;
        const messagesPerSec = messageCount / elapsedSecs;
        
        console.log(`Checkpoint ${checkpointNum}/${numCheckpoints}: ${messagesPerSec.toFixed(0)} msgs/sec`);
        
        // Reset for next checkpoint
        messageCount = 0;
        lastCheckpoint = now;
        checkpointNum++;
        
        if (checkpointNum > numCheckpoints) {
          console.log("✅ Test finished.");
          process.exit(0);
        }
      }
    });
    
    console.log("✅ Subscription started");
    
    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\nTest interrupted');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Subscription failed:', error);
    process.exit(1);
  }
}

main().catch(console.error); 