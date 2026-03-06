/**
 * Agent B — "DataAnalyst" Service Consumer
 *
 * CRITICAL: The consumer also creates an Azeth smart account so that:
 *   - Its x402 payments are traceable on-chain
 *   - It can submit reputation feedback (only smart account holders can rate)
 *   - It builds its own reputation as a reliable payer
 *
 * Without a smart account, a consumer is invisible and cannot rate providers.
 */

import 'dotenv/config';
import chalk from 'chalk';
import { AzethKit } from '@azeth/sdk';

function log(msg: string) {
  console.log(chalk.green(`[Consumer] ${msg}`));
}

export async function runConsumer(): Promise<void> {
  const privateKey = process.env['CONSUMER_PRIVATE_KEY'];
  if (!privateKey) {
    console.error('Set CONSUMER_PRIVATE_KEY in .env');
    process.exit(1);
  }

  const chain = (process.env['AZETH_CHAIN'] ?? 'baseSepolia') as 'baseSepolia' | 'base';

  log('Starting DataAnalyst...');

  // 1. Create SDK instance
  const agent = await AzethKit.create({
    privateKey: privateKey as `0x${string}`,
    chain,
    rpcUrl: process.env['AZETH_RPC_URL'],
  });

  log(`EOA: ${agent.address}`);

  // 2. Create smart account — REQUIRED to submit reputation feedback
  const accounts = await agent.getSmartAccounts();
  if (accounts.length === 0) {
    log('Creating smart account + trust registry entry...');
    await agent.createAccount({
      name: 'DataAnalyst',
      entityType: 'agent',
      description: 'Consumes weather data and builds analytics reports',
    });
    log(`Smart account: ${chalk.bold(agent.smartAccount!)}`);
  } else {
    log(`Smart account: ${chalk.bold(accounts[0]!)}`);
  }

  // 3. Discover services by capability
  log('\nSearching trust registry for "weather-data" services...');
  const services = await agent.discoverServices({ capability: 'weather-data' });

  if (services.length === 0) {
    log(chalk.red('No weather services found. Start the provider first: npm run demo:provider'));
    return;
  }

  const service = services[0]!;
  log(`Found: ${chalk.bold(service.name)} (tokenId: ${service.tokenId})`);
  log(`  Endpoint: ${chalk.cyan(service.endpoint)}`);
  log(`  Entity type: ${service.entityType}`);

  // 4. Check reputation before trusting
  log('\nChecking provider reputation...');
  const reputation = await agent.getWeightedReputation(service.tokenId);
  log(`  Composite score: ${chalk.bold(String(reputation.compositeScore))}/100`);
  log(`  Total interactions: ${reputation.totalInteractions}`);

  if (reputation.compositeScore < 20) {
    log(chalk.yellow('  Low reputation — proceeding with caution (small payment)'));
  } else {
    log(chalk.green('  Reputation acceptable — proceeding with payment'));
  }

  // 5. Pay for weather data via x402
  log('\nRequesting weather data for London...');
  log(`  Paying $0.001 USDC via x402...`);
  const startTime = Date.now();
  const result = await agent.pay(`${service.endpoint}/api/weather/london`);
  const responseTimeMs = Date.now() - startTime;

  log(chalk.bold('\n  Weather Data Received:'));
  const data = result.data as Record<string, unknown>;
  log(`    City: ${data['city']}`);
  log(`    Temperature: ${data['temperature']}°C`);
  log(`    Humidity: ${data['humidity']}%`);
  log(`    Conditions: ${data['conditions']}`);
  log(`    Timestamp: ${data['timestamp']}`);
  log(`  Response time: ${responseTimeMs}ms`);

  // 6. Rate the provider on-chain
  log('\nSubmitting on-chain reputation feedback...');
  const qualityScore = responseTimeMs < 2000 ? 90 : responseTimeMs < 5000 ? 70 : 50;
  await agent.submitOpinion({
    serviceTokenId: service.tokenId,
    success: true,
    responseTimeMs,
    qualityScore,
  });
  log(`  Opinion submitted! Quality: ${qualityScore}/100`);
  log(`  Provider's reputation has been updated on-chain.`);

  log(chalk.bold('\nComplete! The trust flywheel turns.'));
}

// Allow running standalone
if (process.argv[1]?.includes('consumer')) {
  runConsumer().catch(console.error);
}
