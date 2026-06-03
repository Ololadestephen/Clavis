# Clavis Backend Boundary

This folder defines the thin integration layer between the frontend, the Clavis contract, and CDR.

The frontend should not decide whether a secret can be released. It asks the backend/CDR integration to read a vault, and that path checks `ClavisVault.canRead(vaultId, reader)` before returning private data.

## Required Adapters

Implement `ContractClient` with the chain library we choose for the frontend, likely `viem`.

Implement `CdrClient` with the CDR SDK/API:

- `createVault({ owner, plaintext }) -> { cdrRef }`
- `readVault({ cdrRef, reader }) -> { plaintext }`

## Critical Demo Behavior

The read path must show all three states:

```text
0 approvals -> denied
1 approval  -> denied
2 approvals -> unlocked, after delay if configured
```
