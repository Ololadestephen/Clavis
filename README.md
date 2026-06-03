# Clavis

Clavis is a programmable private recovery vault for digital secrets and files. It uses CDR to keep private data sealed, while a Story Aeneid smart contract decides when a beneficiary is allowed to unlock it.

Live app: https://clavis-rust.vercel.app/

## Why Clavis Exists

Wallets, private keys, recovery notes, legal instructions, and important files are often either too exposed or impossible for trusted people to recover when something happens. Clavis creates a recovery plan with programmable rules:

1. The owner seals a private note or encrypted file.
2. The owner names one beneficiary and three guardians.
3. The owner sets proof-of-life duration, guardian threshold, and final delay.
4. The beneficiary can request recovery only after the owner becomes inactive.
5. Guardians approve the request.
6. CDR releases the private payload only when the contract condition passes.


## Deployed Contract

Network: Story Aeneid testnet

ClavisVault:

```text
0xc1240de35b015acca30b2d9d58e66ac4ab811bb9
```

Deploy transaction:

```text
0xf80d36657857537fc79d5cfde9562cd69f4d227ee0966573700c2a4ce921bf55
```

## How The Recovery Rule Works

The owner always retains access. The beneficiary can read only when all required conditions pass:

- Recovery has been requested.
- Recovery has not been cancelled.
- Guardian approval count meets the configured threshold.
- The final delay has elapsed.
- The owner proof-of-life window has expired.

The read gate lives in `src/ClavisVault.sol`:

```solidity
canRead(uint256 vaultId, address reader)
```

CDR calls the contract through:

```solidity
checkReadCondition(...)
checkWriteCondition(...)
```

The CDR condition data is `abi.encode(vaultId)`, so each encrypted CDR vault is linked to the exact on-chain recovery rule.

## File Storage Model

Small notes are encrypted and written directly to CDR.

Files are handled differently because CDR payload size is limited on the current testnet:

1. The browser encrypts the file with AES-GCM.
2. The encrypted file is uploaded to IPFS through Pinata.
3. CDR stores the file metadata, CID, gateway URL, AES key, and IV.
4. The beneficiary can recover and decrypt the file only after CDR access succeeds.

This still uses CDR for the sensitive unlock material. IPFS only stores encrypted bytes.

## User Flow

Owner:

1. Connect wallet.
2. Create vault.
3. Add beneficiary and guardians.
4. Set threshold, proof-of-life duration, and final delay.
5. Seal the note or encrypted file.
6. Copy the beneficiary and guardian invite messages.
7. Send heartbeat periodically.
8. Cancel recovery if they return while recovery is active.

Beneficiary:

1. Open the recovery page.
2. Enter vault ID.
3. Connect beneficiary wallet.
4. Request recovery once proof-of-life has expired.
5. Open unlock page after guardian approvals and final delay.

Guardian:

1. Open guardian approval page.
2. Enter vault ID.
3. Connect guardian wallet.
4. Approve recovery after the beneficiary has requested it.

## Tech Stack

- Next.js App Router
- TypeScript
- Story Aeneid
- Solidity / Foundry
- CDR SDK
- Viem
- IPFS via Pinata
- Vercel Analytics

## Repository Structure

```text
src/ClavisVault.sol              Smart contract permission engine
test/ClavisVault.t.sol           Foundry tests
scripts/deploy-clavis.ts         Contract deployment script
scripts/cdr-*.ts                 CDR demo scripts
frontend/app                     Next.js application
frontend/app/api/ipfs/upload     Pinata/IPFS upload route
backend/clavisGateway.ts         Backend/CDR integration boundary notes
```

## Local Development

Install root dependencies:

```sh
npm install
```

Install frontend dependencies:

```sh
cd frontend
npm install
```

Run the frontend:

```sh
cd frontend
npm run dev
```

Build the frontend:

```sh
cd frontend
npm run build
```

Run contract tests:

```sh
forge test
```

If Foundry on macOS crashes while trying to initialize signature/gas reporting, this command avoids the optional gas report path:

```sh
FOUNDRY_GAS_REPORTS='[]' forge test
```

## Environment Variables

Root `.env` for scripts:

```text
RPC_URL=https://aeneid.storyrpc.io
STORY_API_URL=http://172.192.41.96:1317
OWNER_PRIVATE_KEY=
BENEFICIARY_PRIVATE_KEY=
GUARDIAN_ONE_PRIVATE_KEY=
GUARDIAN_TWO_PRIVATE_KEY=
GUARDIAN_THREE_PRIVATE_KEY=
CLAVIS_CONTRACT_ADDRESS=0xc1240de35b015acca30b2d9d58e66ac4ab811bb9
```

Frontend `.env.local`:

```text
NEXT_PUBLIC_APP_URL=https://clavis-rust.vercel.app
NEXT_PUBLIC_RPC_URL=https://aeneid.storyrpc.io
NEXT_PUBLIC_STORY_API_URL=http://172.192.41.96:1317
NEXT_PUBLIC_CLAVIS_CONTRACT_ADDRESS=0xc1240de35b015acca30b2d9d58e66ac4ab811bb9
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs
PINATA_JWT=
```

`PINATA_API_KEY` and `PINATA_SECRET_API_KEY` can be used instead of `PINATA_JWT`.


## Useful Scripts

Deploy the contract:

```sh
npm run cdr:deploy
```

Run demo flows:

```sh
npm run cdr:demo
npm run cdr:advanced
CLAVIS_FILE_PATH=./recovery-note.pdf npm run cdr:file
```


## Submission Summary

Clavis demonstrates programmable private data recovery using CDR, on-chain proof-of-life, guardian threshold approval, final delay, and CDR-gated unlock. It is not just encrypted storage; it is private data governed by dynamic, composable access rules.
