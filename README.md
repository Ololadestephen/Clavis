# Clavis: Native-BOT Inheritance Vault

Clavis is a programmable native-BOT inheritance escrow vault on BOT Chain. It provides multi-party guardian consensus, proof-of-life heartbeats, timelocked recovery execution, and financial isolation to release native funds to a designated beneficiary after extended owner inactivity.

## Mission & Scope

Clavis operates as an on-chain native-BOT inheritance vault holding and releasing funds. It is not an arbitrary secret decryptor or off-chain CDR service.

> **Notice:** This is an on-chain programmable asset release mechanism governed by owner heartbeats and guardian consensus. It does not verify legal death, create an attested will, or recover arbitrary external private keys.

## Core Lifecycle

1. **Owner Setup & Deposit**: The owner creates an isolated vault with a fixed beneficiary, unique guardians, consensus threshold, proof-of-life inactivity timeout, and final timelock release delay. Native BOT can be deposited initially or at any point before release.
2. **Owner Custody & Control**: Before terminal release, the owner retains complete custody of their funds and can withdraw deposited BOT, deposit additional funds, send heartbeats to reset inactivity, or cancel active recovery requests.
3. **Inactivity & Proof-of-Life**: If the owner does not send a heartbeat within the configured timeout window, the vault enters an inactive state, enabling the beneficiary to initiate a recovery request.
4. **Monotonic Request IDs & Stale Approval Invalidation**: Each recovery request receives a unique monotonic request ID. Guardian approvals are strictly bound to this ID. If an owner sends a heartbeat or cancels the request, the request is invalidated; previous approvals cannot authorize future requests.
5. **Guardian Consensus**: Configured guardians inspect the active request and submit approvals on BOT Chain without having custody of the funds.
6. **Timelock Delay & Payout**: Once guardian approvals reach the threshold, the inactivity window holds, and the timelock delay elapses, the beneficiary executes `claim()`. The contract atomically writes terminal state, zeros vault liability, and transfers native BOT directly to the beneficiary's wallet.
7. **Terminal State**: A released vault cannot receive further deposits, withdrawals, heartbeats, requests, or duplicate claims.

## Security & Custody Invariants

- **Role Separation**: Owner and beneficiary must be distinct addresses; configured guardians must be distinct from both.
- **Deposit Control**: Only the vault owner can deposit, withdraw unreleased funds, send heartbeats, or cancel requests.
- **Isolated Accounting**: Each vault tracks credited balances explicitly. Forced transfers, account balance changes, or withdrawals on one vault cannot affect another vault.
- **Per-Request Approvals**: Approvals apply strictly to one request ID and are permanently invalidated by owner heartbeats or cancellations.
- **Atomic Terminal Release**: Payout uses checks-effects-interactions and reentrancy protection. Terminal state is recorded and liability cleared before external transfer; failed transfers revert all state changes.

## Network & Chain Parameters

- **Network**: BOT Chain Mainnet (Chain ID `677`) / Testnet (`968`)
- **Native Currency**: BOT (18 decimals)
- **RPC Endpoint**: `https://rpc.botchain.ai`
- **Block Explorer**: `https://scan.botchain.ai`
- **Developer Docs**: `https://dev-docs.botchain.ai`

## Verification & Testing

Contract test suite covers all lifecycle states, role validation, boundary conditions, failed transfers, reentrancy attacks, multi-vault balance isolation, and fuzzing:

```bash
forge test --offline
```

Build the Next.js frontend application:

```bash
npm --prefix frontend run build
```

Run contract deployment to BOT Chain:

```bash
npm run bot:deploy
```

## Repository Structure

```text
src/ClavisVault.sol              Native-BOT inheritance escrow vault contract
test/ClavisVault.t.sol           Foundry invariant, lifecycle, fuzz, and reentrancy test suite
scripts/config.ts                BOT Chain and network configuration
scripts/clavisAbi.ts             Contract ABI definition
scripts/deploy-botchain.ts       BOT Chain deployment script
frontend/app                     Next.js application (dashboard, create-vault, beneficiary, guardian, unlock)
frontend/app/create-vault/       Vault creation and configuration interface
frontend/app/dashboard/          Owner dashboard: balance, heartbeat, deposits/withdrawals, cancellation
frontend/app/beneficiary/        Beneficiary recovery request and inheritance claim
frontend/app/guardian/           Guardian multi-party approval
frontend/app/unlock/             Public on-chain release and audit status
docs/HISTORICAL_CDR.md           Historical Story Protocol CDR architecture and proof archive
```

## Historical Story Protocol CDR Proofs

Clavis originally piloted read-condition validation on the Story Protocol Aeneid testnet using Confidential Data Recovery (CDR). Historical contracts (`0x3948d6ac6575526e61f00979124003319d849cd0`) and demonstration scripts remain permanently documented in [`docs/HISTORICAL_CDR.md`](docs/HISTORICAL_CDR.md).
