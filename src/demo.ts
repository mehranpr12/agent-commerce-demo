/**
 * Demo Orchestrator — runs both agents end-to-end
 *
 * Starts the provider, waits for it to register, then runs the consumer.
 * Shows the full machine economy loop in one terminal.
 */

import 'dotenv/config';
import { spawn } from 'child_process';
import chalk from 'chalk';

function banner(text: string) {
  const line = '═'.repeat(60);
  console.log(chalk.magenta(`\n╔${line}╗`));
  console.log(chalk.magenta(`║${text.padStart(30 + text.length / 2).padEnd(60)}║`));
  console.log(chalk.magenta(`╚${line}╝\n`));
}

function separator() {
  console.log(chalk.gray('─'.repeat(62)));
}

async function main() {
  banner('Azeth Agent Commerce Demo');

  console.log(chalk.white('Two AI agents will:'));
  console.log(chalk.white('  1. Create smart accounts on Base Sepolia'));
  console.log(chalk.white('  2. Register/discover via the ERC-8004 trust registry'));
  console.log(chalk.white('  3. Exchange value via x402 payments'));
  console.log(chalk.white('  4. Rate each other on-chain\n'));

  // Verify env
  if (!process.env['PROVIDER_PRIVATE_KEY'] || !process.env['CONSUMER_PRIVATE_KEY']) {
    console.error(chalk.red('Missing keys. Copy .env.example to .env and add two private keys.'));
    process.exit(1);
  }

  if (process.env['PROVIDER_PRIVATE_KEY'] === process.env['CONSUMER_PRIVATE_KEY']) {
    console.error(chalk.red('Provider and consumer must use different private keys.'));
    process.exit(1);
  }

  // Phase 1: Start provider
  separator();
  console.log(chalk.blue.bold('\n Phase 1: Starting Provider (WeatherOracle)\n'));

  const provider = spawn('npx', ['tsx', 'src/provider.ts'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
    cwd: import.meta.dirname ? import.meta.dirname + '/..' : process.cwd(),
  });

  // Wait for provider to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Provider startup timed out (60s)')), 60_000);

    provider.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      process.stdout.write(text);
      if (text.includes('Waiting for agent payments')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    provider.stderr?.on('data', (chunk: Buffer) => {
      process.stderr.write(chunk.toString());
    });

    provider.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    provider.on('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Provider exited with code ${code}`));
      }
    });
  });

  console.log(chalk.blue.bold('\n Provider ready!\n'));

  // Phase 2: Run consumer
  separator();
  console.log(chalk.green.bold('\n Phase 2: Running Consumer (DataAnalyst)\n'));

  const { runConsumer } = await import('./consumer.js');
  await runConsumer();

  // Phase 3: Summary
  separator();
  banner('Demo Complete');

  console.log(chalk.white('What just happened on-chain:\n'));
  console.log(chalk.blue('  Provider (WeatherOracle):'));
  console.log(chalk.white('    - Deployed ERC-4337 smart account'));
  console.log(chalk.white('    - Minted ERC-8004 trust registry NFT'));
  console.log(chalk.white('    - Received USDC payment via x402'));
  console.log(chalk.white('    - Reputation score increased\n'));
  console.log(chalk.green('  Consumer (DataAnalyst):'));
  console.log(chalk.white('    - Deployed ERC-4337 smart account'));
  console.log(chalk.white('    - Discovered service via trust registry'));
  console.log(chalk.white('    - Paid $0.001 USDC via x402'));
  console.log(chalk.white('    - Submitted on-chain reputation feedback\n'));

  console.log(chalk.magenta.bold('  The trust flywheel turns. More interactions = better reputation'));
  console.log(chalk.magenta.bold('  = higher discovery ranking = more interactions.\n'));

  console.log(chalk.gray('Learn more: https://azeth.ai'));
  console.log(chalk.gray('MCP Server: npx @azeth/mcp-server'));
  console.log(chalk.gray('SDK: npm install @azeth/sdk\n'));

  // Clean up
  provider.kill('SIGTERM');
  process.exit(0);
}

main().catch((err) => {
  console.error(chalk.red(`\nDemo failed: ${err.message}`));
  process.exit(1);
});
