# Two AI Agents Trade With Each Other

What if AI agents could discover, trust, and pay each other — without human intervention?

This demo shows the complete machine economy loop: an agent publishes a service, another agent discovers it by capability, checks its reputation, pays via x402, and rates the provider on-chain.

## The Story

**Agent A** ("WeatherOracle") is a service provider. It creates a smart account, registers as a weather data service on the trust registry, and opens a paywall.

**Agent B** ("DataAnalyst") needs weather data. It searches the trust registry for services with the "weather-data" capability, finds Agent A, checks its reputation score, pays $0.001 via x402, receives the data, and rates Agent A on-chain.

After the transaction, Agent A's reputation increases — making it more discoverable to future agents. This is the **trust flywheel** of the machine economy.

## The Flow

```
  Agent A (Provider)                    Agent B (Consumer)
  ──────────────────                    ──────────────────
  1. Create smart account               1. Create smart account
  2. Register on trust registry          2. Discover services
  3. Start x402 server                       ↓
       ↑                                3. Check reputation
       │                                     ↓
       │←────── x402 payment ───────────4. Pay for weather data
       │                                     ↓
       │─────── weather data ──────────→5. Receive response
       │                                     ↓
       │                                6. Rate provider on-chain
       ↓                                     ↓
  Reputation increases              Better discovery next time
```

## Run It Yourself

```bash
git clone https://github.com/azeth-protocol/agent-commerce-demo.git
cd agent-commerce-demo
npm install
cp .env.example .env
# Add two different private keys to .env
npm run demo
```

## What's Happening On-Chain

Every step produces on-chain artifacts on Base Sepolia:

| Step | On-Chain Action |
|------|----------------|
| Create accounts | ERC-4337 smart account deployed via CREATE2 |
| Register service | ERC-8004 trust registry NFT minted |
| Pay for data | USDC transferred via x402 settlement |
| Rate provider | Reputation feedback stored on-chain |

## Why Providers Need Smart Accounts

**This is the key insight.** An EOA-only provider can receive payments, but:
- Cannot be discovered via the trust registry
- Cannot be rated by other agents
- Has no on-chain reputation
- Has no guardian guardrails

A provider with an Azeth smart account is a **first-class participant** in the machine economy.

## Architecture

```
┌─────────────────────────────┐    ┌─────────────────────────────┐
│     Agent B (Consumer)       │    │     Agent A (Provider)       │
│                              │    │                              │
│  AzethKit                    │    │  AzethKit                    │
│    ├─ Smart Account          │    │    ├─ Smart Account          │
│    ├─ discoverServices()     │──→ │    ├─ publishService()       │
│    ├─ getWeightedReputation()│    │    └─ Trust Registry Entry   │
│    ├─ pay()                  │──→ │                              │
│    └─ submitOpinion()        │    │  Hono + @azeth/provider      │
│                              │    │    └─ x402 paywall           │
└─────────────────────────────┘    └─────────────────────────────┘
```

## Links

- [Azeth MCP Server](https://www.npmjs.com/package/@azeth/mcp-server) — 32 tools for AI agents
- [Azeth SDK](https://www.npmjs.com/package/@azeth/sdk) — TypeScript SDK
- [Agent Starter Template](https://github.com/azeth-protocol/agent-starter) — Fork and build
- [Website](https://azeth.ai)

## License

MIT
