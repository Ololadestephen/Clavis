# Clavis

Clavis is a programmable private recovery vault for CDR-backed secrets.

The secret lives in a CDR vault. The smart contract stores the recovery rules and exposes `canRead(vaultId, reader)`, which the CDR layer or a backend proxy can call before releasing private data.

## Backend Demo Path

1. Owner creates a vault with a beneficiary, three guardians, a `2 of 3` threshold, and an optional unlock delay.
2. Beneficiary tries to read before recovery starts. `canRead` returns `false`.
3. Beneficiary requests recovery.
4. First guardian approves. `canRead` still returns `false`.
5. Second guardian approves. If the unlock delay has passed, `canRead` returns `true`.
6. Owner can cancel a pending recovery, making `canRead` return `false` again.

## Contract API

- `createVault(beneficiary, guardians, threshold, unlockDelay, heartbeatTimeout, cdrRef)`
- `requestRecovery(vaultId)`
- `approveRecovery(vaultId)`
- `cancelRecovery(vaultId)`
- `heartbeat(vaultId)`
- `canRead(vaultId, reader)`
- `setCdrRef(vaultId, cdrRef)`

## CDR Integration Boundary

Use the contract as the read gate:

```text
CDR read request
  -> wallet/address is resolved as reader
  -> call ClavisVault.canRead(vaultId, reader)
  -> release private payload only when true
```

If the CDR SDK returns its vault identifier after contract creation, call `setCdrRef` to attach it to the vault record.

## Commands

```sh
make test
```

Direct Foundry command:

```sh
forge test --offline
```

## Current Backend Scope

- `src/ClavisVault.sol` is the source of truth for dynamic permissioning.
- `backend/clavisGateway.ts` defines the frontend/CDR integration boundary.
- `test/ClavisVault.t.sol` verifies the recovery and denial paths.

## Actual CDR Flow

CDR custom conditions call `checkReadCondition` / `checkWriteCondition`. `ClavisVault` implements both, and the CDR vault stores `abi.encode(vaultId)` as its condition data.

Run the live flow on Story Aeneid:

```sh
npm install
make test
npm run cdr:deploy
npm run cdr:demo
npm run cdr:advanced
CLAVIS_FILE_PATH=./recovery-note.pdf npm run cdr:file
```

The demo script needs funded Aeneid private keys in `.env`.

`cdr:advanced` uses short defaults for a live Proof-of-Life demo:

- `ADVANCED_HEARTBEAT_TIMEOUT_SECONDS=45`
- `ADVANCED_UNLOCK_DELAY_SECONDS=30`
