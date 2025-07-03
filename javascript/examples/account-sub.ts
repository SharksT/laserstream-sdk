import { subscribe, CommitmentLevel, SubscribeUpdate, LaserstreamConfig } from '../client';
const credentials = require('../test-config');

async function main() {
  console.log('🏦 LaserStream Account Subscription Example');
  console.log('='.repeat(50));

  const config: LaserstreamConfig = {
    apiKey: credentials.laserstreamProduction.apiKey,
    endpoint: credentials.laserstreamProduction.endpoint,
  };

  const request = {
    accounts: {
      "all-accounts": {
        account: [],
        owner: [],
        filters: []
      }
    },
    commitment: CommitmentLevel.Processed,
    // Empty objects for unused subscription types
    slots: {},
    transactions: {},
    transactionsStatus: {},
    blocks: {},
    blocksMeta: {},
    entry: {},
    accountsDataSlice: [],
  };

  const stream = await subscribe(
    config,
    request,
    async (update: SubscribeUpdate) => {
      console.log('🏦 Account Update:', update);
    },
    async (err) => console.error('❌ Stream error:', err)
  );

  console.log(`✅ Account subscription started (id: ${stream.id})`);
}

main().catch(console.error); 