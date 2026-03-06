/**
 * Agent A — "WeatherOracle" Service Provider
 *
 * CRITICAL: The provider creates an Azeth smart account so that:
 *   - Other agents can discover it via the trust registry
 *   - Other agents can rate it on-chain (ERC-8004 reputation)
 *   - Guardian guardrails protect its funds
 *
 * Without a smart account, a provider is invisible to the machine economy.
 */

import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import chalk from 'chalk';
import { AzethKit } from '@azeth/sdk';
import { createX402StackFromEnv, paymentMiddlewareFromHTTPServer } from '@azeth/provider';

const PORT = 3402;

function log(msg: string) {
  console.log(chalk.blue(`[Provider] ${msg}`));
}

async function main() {
  const privateKey = process.env['PROVIDER_PRIVATE_KEY'];
  if (!privateKey) {
    console.error('Set PROVIDER_PRIVATE_KEY in .env');
    process.exit(1);
  }

  const chain = (process.env['AZETH_CHAIN'] ?? 'baseSepolia') as 'baseSepolia' | 'base';

  log('Starting WeatherOracle...');

  // 1. Create SDK instance
  const agent = await AzethKit.create({
    privateKey: privateKey as `0x${string}`,
    chain,
    rpcUrl: process.env['AZETH_RPC_URL'],
  });

  log(`EOA: ${agent.address}`);

  // 2. Create smart account — REQUIRED for reputation and discovery
  const accounts = await agent.getSmartAccounts();
  if (accounts.length === 0) {
    log('Creating smart account + trust registry entry...');
    await agent.createAccount({
      name: 'WeatherOracle',
      entityType: 'service',
      description: 'Real-time weather data for AI agents',
    });
    log(`Smart account: ${chalk.bold(agent.smartAccount!)}`);
  } else {
    log(`Smart account: ${chalk.bold(accounts[0]!)}`);
  }

  // 3. Register on trust registry
  log('Publishing service on trust registry...');
  const reg = await agent.publishService({
    capabilities: ['weather-data'],
    endpoint: `http://localhost:${PORT}`,
  });
  log(`Registered! TokenId: ${chalk.bold(String(reg.tokenId))}`);

  // 4. Set up x402 paywall
  const routes = {
    'GET /api/weather/:city': {
      price: '$0.001',
      network: 'base-sepolia',
      description: 'Weather data for a city',
    },
  };

  const x402 = createX402StackFromEnv(routes);

  // 5. Build Hono app
  const app = new Hono();

  app.get('/health', (c) => c.json({ status: 'ok' }));

  if (x402) {
    app.use('/api/*', paymentMiddlewareFromHTTPServer(x402.httpServer));
  }

  app.get('/api/weather/:city', (c) => {
    const city = c.req.param('city');
    log(`Serving weather data for ${chalk.yellow(city)} (paid via x402)`);
    return c.json({
      city,
      temperature: Math.round(15 + Math.random() * 15),
      humidity: Math.round(40 + Math.random() * 40),
      conditions: ['sunny', 'cloudy', 'rainy', 'windy'][Math.floor(Math.random() * 4)],
      timestamp: Math.floor(Date.now() / 1000),
      provider: 'WeatherOracle',
    });
  });

  // 6. Start
  serve({ fetch: app.fetch, port: PORT }, () => {
    log(`\nServer running on http://localhost:${PORT}`);
    log(`Waiting for agent payments...`);
    log(`Press Ctrl+C to stop\n`);
  });
}

main().catch(console.error);
