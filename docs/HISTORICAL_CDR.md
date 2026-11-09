# Historical Story Protocol CDR Architecture & Proof Records

## Overview

Prior to its conversion to a native-BOT inheritance vault on BOT Chain, Clavis was originally designed as a threshold-encrypted private data recovery gate on the Story Protocol Aeneid testnet using Confidential Data Recovery (CDR).

This document permanently archives the historical CDR architecture, proof logs, and contracts for verification and record-keeping purposes.

## Historical System Components

1. **Smart Contract**: `ClavisVault.sol` (Original Commit: `28d543eb6045aac22a01da0f7cf5b71053413bd1`)
   - Function: Acted as an on-chain read condition validator (`checkReadCondition`) and write condition validator (`checkWriteCondition`) for the Story CDR threshold network.
   - Mechanism: Beneficiary requested recovery, guardians approved, and upon inactivity timeout expiration, `canRead(vaultId, reader)` returned `true`.
   - Historical Testnet Deployment: `0x3948d6ac6575526e61f00979124003319d849cd0` (Story Aeneid Testnet, Chain ID 1315).

2. **CDR SDK Integration**:
   - Observer: Interacted with Story CDR node RPC at `http://172.192.41.96:1317` and fetched the global public key (`getGlobalPubKey`).
   - Uploader: Used threshold ElGamal/TDH2 encryption to allocate a CDR UUID and write encrypted secrets (`encryptDataKey`, `write`).
   - Consumer: Once `canRead` evaluated to true, requested validator partial decryptions (`accessCDR`) and reconstructed the plaintext.

3. **Demonstration Scripts**:
   - `scripts/cdr-demo.ts`: Text secret roundtrip (allocate -> encrypt -> write -> request recovery -> guardian approval -> timelock -> CDR decrypt).
   - `scripts/cdr-advanced-demo.ts`: Advanced multi-guardian consensus with rejection and cancellation tests.
   - `scripts/cdr-file-demo.ts`: Hybrid AES-GCM + IPFS encrypted file demo with CDR-escrowed decryption key.

## Archival Verification

The historical demo scripts remain preserved in the `scripts/` directory for historical reference. The active application in this repository now operates as an on-chain native asset custody and inheritance vault on BOT Chain.
