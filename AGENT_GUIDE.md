# Coding Agent Guide: Clavis BOT Inheritance Vault

Updated: 2026-11-07.
Repository: /Users/apple/Documents/Story Hackathon

Read applicable AGENTS.md instructions, plan.md, README.md, package scripts, and git status/diff. Use the user's actual request to establish what work and external actions are authorized.

## Mission

Convert Clavis into a native-BOT inheritance vault. The user explicitly chose this direction. The active BOT Chain app will hold and release funds; it will not offer Story CDR/private-file recovery.

## Preserve

- recoverkit/ is unrelated untracked work.
- Historical Story/CDR source and proof records must remain identifiable.
- Keep existing page layout and role-oriented navigation where useful.
- Do not deploy the read-permission contract unchanged and call it an inheritance escrow.

## Source Reading Order

1. src/ClavisVault.sol and test/ClavisVault.t.sol.
2. frontend/app/components/wallet.ts, vaultStorage.ts, and friendlyErrors.ts.
3. frontend/app/create-vault/CreateVaultForm.tsx and create-vault/cdrBrowser.ts.
4. frontend/app/dashboard/DashboardOverview.tsx.
5. frontend/app/beneficiary/RecoveryRequest.tsx.
6. frontend/app/guardian/GuardianApproval.tsx.
7. frontend/app/unlock/UnlockCdr.tsx.
8. scripts/config.ts, scripts/clavisAbi.ts, scripts/deploy-clavis.ts, and foundry.toml.
9. backend/clavisGateway.ts and current Story/IPFS routes to identify active CDR dependencies to retire from this release.

## First Concrete Task

Specify the custody state machine and invariants before editing the frontend. Add tests that expose missing real-fund accounting and bind approvals to request IDs.

States should distinguish an active vault, current recovery request, cancelled/invalidated request, and terminal released vault. A read-eligibility boolean is insufficient to authorize a payout by itself.

## Implementation Order

1. Run existing contract tests and frontend build as a baseline.
2. Add per-vault BOT accounting, bounded configuration, and role/address validation.
3. Implement owner funding/withdrawal and heartbeats.
4. Implement beneficiary request/claim and per-request guardian approvals.
5. Make heartbeat and cancellation invalidate current requests and old approvals.
6. Add release timing, balance clearing, terminal-state checks, failed-transfer handling, and reentrancy tests.
7. Adapt existing role pages to the new contract and native-BOT flows.
8. Remove CDR/seed-phrase/file-unlock controls from the active BOT Chain UI and remove unused dependencies only after checking their imports.
9. Add clear BOT Chain configuration and a new deployment path.
10. Complete a local four-wallet walkthrough, documentation, and the authorized release process.

## Invariants To Test

- Owner and beneficiary are distinct; configured guardians are distinct from both.
- Only owner controls deposits credited to their vault through withdrawals/cancellation/heartbeat.
- Only beneficiary requests and claims; only listed guardians approve.
- Approvals apply to one request ID and cannot survive cancellation or heartbeat.
- Claim checks current request, threshold, delay, inactivity, and non-released status together.
- No guardian action directly sends funds.
- Multiple vaults remain financially isolated.
- Release writes terminal state and clears liability before external transfer; a failed transfer reverts those changes.
- A released vault cannot receive further credited deposits or pay again.
- Changing time in local tests is labelled test behavior, not real-world inactivity evidence.

## Verification Commands

From the repository root:

```bash
forge test --offline
npm --prefix frontend run build
```

Inspect available scripts before using lint/type checks. Add focused new state-machine/fuzz/invariant tests appropriate to funds custody. Browser checks must cover owner, beneficiary, and guardian wallets plus the wrong-network path.

Do not run old CDR demo/deployment scripts as the BOT Chain release test.

## User-Facing Semantics

Show actual credited BOT, last heartbeat, eligibility time, active request ID, approvals, release delay, and transaction state. The owner can withdraw or cancel before release; document that plainly.

This is on-chain release to a configured beneficiary after inactivity and guardian approval. It does not verify death, create a legal will, or recover arbitrary external wallets.

## Completion Criteria

The complete deposit -> heartbeat/inactivity -> recovery request -> approval -> claim flow works against the new contract. Cancellation, stale approvals, duplicate release, failed calls, and cross-vault access fail safely. The app no longer implies CDR secret recovery is part of this version.

## Quality And Handoff

Follow the user's current instructions and applicable AGENTS.md files. Before non-trivial implementation, check the baseline, ensure Desloppify state is ignored, and scan only the coherent application or contract boundary. Inspect status and next. After changes run appropriate format/static/tests/build checks and rescan. Do not exclude authored code, weaken tests, or mark findings resolved to improve a score artificially.

Keep dependencies/generated output and unrelated nested projects outside the work boundary. Preserve changes you did not make. Use existing libraries and local patterns; add abstractions only when they remove real complexity.

Complete independent reversible implementation work without unnecessary confirmation. Continue around missing credentials when possible using clearly labelled local fixtures. Ask for a decision only where it blocks the next dependent action. Follow actual user authorization for installations, paid services, mainnet transactions, deployment, posting, committing, and pushing.

Keep private keys and tokens in ignored local environment files. Avoid loading the owner's grant wallet as a deployment or service signer. Never print secrets, automatically publish social drafts, or claim unexecuted tests/deployments succeeded.

Use the program checklist in plan.md for external deliverables. Four participating wallets must have relevant successful originating transactions; record real sender addresses and hashes. Draft social content without inventing users, customers, metrics, or affiliations.

Append a dated execution note to plan.md at handoff:
- Completed tasks and exact files changed.
- Commands actually run and their outcomes, including baseline failures.
- Real deployment and verification evidence, if authorized and completed.
- Remaining risks/decisions, missing configuration, and the next exact action.

Distinguish local implementation, mainnet deployment, participant walkthrough, onboarding approval, and payment. Leave unchecked items incomplete. Recheck any old timeline if this guide is resumed later.

## Starting Prompt

> Read applicable AGENTS.md instructions, plan.md, and AGENT_GUIDE.md. Implement Clavis's native-BOT inheritance vault, starting with custody and request-generation tests. Preserve recoverkit and historical CDR evidence, adapt the existing role pages, and report the exact tested state and remaining deployment/onboarding actions.
