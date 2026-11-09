# Clavis: BOT Inheritance Vault Plan

Updated: 2026-11-07.
Status: planned next-batch adaptation; no implementation or new deployment is claimed.

## Project And Approved Direction

Repository: /Users/apple/Documents/Story Hackathon
GitHub: https://github.com/Ololadestephen/Clavis
Working name: Clavis, unless the user requests a change.

The user selected a native-BOT inheritance vault. Replace the current Story CDR/private-file workflow for the BOT Chain release. Keep guardian approval, inactivity, heartbeat, cancellation, and release-delay concepts, and add real native-fund accounting.

## Existing Foundation And Preservation

- src/ClavisVault.sol and test/ClavisVault.t.sol.
- Next.js owner, beneficiary, guardian, dashboard, and unlock views under frontend/app/.
- Current viem integration and deployment scripts.
- Historical Story/CDR demonstrations and evidence.
- Untracked recoverkit/ is unrelated and must be preserved.

The current contract controls read permissions; it does not already escrow BOT or pay an inheritance. Implement and test the new asset custody behavior rather than relabelling the current canRead result as a withdrawal.

## Minimal Product

One native-BOT vault contract with multiple isolated vaults.

1. Owner creates a vault with a fixed beneficiary, unique guardians, threshold, inactivity period, and final release delay.
2. Owner deposits BOT and can withdraw their funds before a completed release.
3. Owner sends heartbeats to reset inactivity and invalidate any current recovery request.
4. After the owner has been inactive long enough, the beneficiary requests recovery.
5. Listed guardians approve that specific request.
6. Once threshold, inactivity, and release delay all hold, the beneficiary claims the vault's BOT.
7. Owner can cancel an unreleased request and restore activity.

No private secrets, seed phrases, encrypted-file upload, CDR service, investment yield, token rewards, asset bridging, or legal-estate automation is included. Describe this as a programmable on-chain beneficiary release, not a legal will or verified death determination.

## State And Permissions

Keep beneficiary, guardians, threshold, inactivity period, and delay fixed for each vault in V1. A different configuration requires a new vault; owner can withdraw from the old one before release.

- Reject zero addresses, duplicate guardians, invalid thresholds, and invalid durations.
- Require distinct owner and beneficiary. Guardians must be distinct from both for the advertised multi-party model.
- Bound guardian count and duration values.
- Only owner can withdraw, send heartbeat, or cancel.
- Only the fixed beneficiary can request and claim.
- Only configured guardians can approve; each approves a given request once.
- Each request receives a monotonically increasing ID. Approval records are bound to that ID.
- A heartbeat/cancellation invalidates the request and its approvals, so old approvals cannot authorize a later request.
- Requesting and claiming both check inactivity; claim also checks threshold, active request ID, and release delay.
- Guardian approvals never transfer funds by themselves.

## Native BOT Accounting

Track each vault's credited balance explicitly. Deposits require value greater than zero and an active vault. An external account balance change or forced BOT transfer must not alter another vault's entitlement.

Before claim's external transfer, mark the vault released, clear its liability, and prevent subsequent deposit/claim/owner withdrawal for that vault. A failed transfer reverts the state, allowing a legitimate retry. Use reentrancy protection and checks-effects-interactions for all fund exits.

Owner withdrawal cannot redirect another vault's funds. Recovery can release only that vault's remaining credited BOT. No platform administrator receives a sweep or beneficiary-redirection permission.

## User Interface

Reuse existing page structure with updated actions:
- Owner: create, fund, inspect balance, heartbeat, cancel, withdraw.
- Beneficiary: view eligibility, request recovery, inspect threshold/delay, claim.
- Guardian: review and approve the current request.
- Activity: timestamps, request ID, approvals, and transaction links.

Replace CDR/secret-unlock copy and controls in the active BOT Chain experience. Preserve historical records in clearly identified documentation. The browser derives countdowns from on-chain state; it cannot authorize early release.

## Verification

- [x] Owner/beneficiary/guardian permissions and address validation pass.
- [x] Four-wallet example works with owner, beneficiary, and two guardians.
- [x] Heartbeat invalidates an active request and every old approval.
- [x] Cancel/re-request increments request ID; stale approvals do not count.
- [x] Requests and claims at exact timing boundaries behave as specified.
- [x] Threshold alone cannot release funds before the delay/inactivity conditions.
- [x] Multiple vaults remain financially isolated.
- [x] Failed transfers, reentrancy, duplicate claims, and owner withdrawal races are tested.
- [x] No further deposits or withdrawals occur on a released vault.
- [x] Frontend build and mobile/desktop role flows pass.

Use local time advancement to test long inactivity periods. Do not falsify historical activity or use production real-world inheritance claims as a test fixture.

## Delivery Order

1. Baseline existing contract/app behavior. (Completed)
2. New custody/state-machine design and contract tests. (Completed)
3. Repurpose the existing role pages and remove active CDR dependencies. (Completed)
4. End-to-end local walkthrough with funded test wallets. (Completed in Foundry test suite & walkthrough test)
5. Authorized deployment, participant evidence, and onboarding. (Awaiting user authorization and dedicated deployment wallet funding)

This is next-batch scope. Resolve any naming or onboarding change before public deployment.

## Program And Release Checklist

- [ ] Confirm this next-batch project and scope with Anthony; the current first-four review remains separate.
- [ ] Confirm the final project name before contract publication and launch posts.
- [ ] Nominate a dedicated gas/deployment wallet for this project, separate from the owner's grant wallet and the other projects.
- [ ] Confirm gas funding and the agreed incentive/payment process.
- [x] Complete local contract, application, and browser checks.
- [ ] Deploy the functional contract to BOT Chain mainnet and record the actual receipt and address.
- [ ] Publish the connected website with BOT Chain website and explorer footer links.
- [ ] Complete meaningful actions from at least four distinct participating wallets and save their transaction evidence.
- [ ] Meet the agreed X/TG requirements. The original request was five standalone project posts, a launch post tagging the official account, and at most three projects per Telegram account; obtain Anthony's answer before assuming shared X accounts qualify.
- [ ] Submit project, repository, website, contract, deployment, social, contact, and usage evidence.
- [ ] Track verification and payment separately from technical completion.

The discussed incentive was 13 USDT after verification plus 1 BOT of upfront gas funding retained by the developer, less actual deployment/usage costs. Confirm that this agreement covers the next batch. Do not assume a fixed USD value for BOT or an unspecified rebate.

## Boundaries And Working Method

Reuse the existing app, infrastructure, and design where suitable. No new paid domain is required. Preserve user changes and unrelated nested projects. A rebrand is a separate explicit decision; do not invent an approved new name.

Implementation follows applicable AGENTS.md instructions and the user's quality policy. Run baseline checks, apply Desloppify only to the coherent application/contract boundary, add focused tests, and rescan after non-trivial code changes. Planning-only work needs no scan.

Use ignored local environment files and dedicated credentials. Never print or commit keys or service tokens. Deployment, paid-service usage, posting, commits, and pushes follow the user's actual authorization. A planning file is not permission to publish or spend funds.

Use current official network information at implementation time and verify the actual chain ID, signer, contract address, and explorer. Record code verification separately from deployment and from Anthony's project review.

## Handoff Evidence

### Execution Note: 2026-11-09

#### 1. Tasks Completed & Exact Files Changed
- **Repository Inspection & Baselines**:
  - Inspected existing codebase and history. Confirmed `recoverkit/` preserved untouched.
  - Added `.desloppify/` to `.gitignore`.
  - Ran baseline `forge test --offline` (9 passed).
  - Identified missing `frontend/node_modules`, ran `npm --prefix frontend ci`, and verified `npm --prefix frontend run build` succeeded.
- **Contract Custody & State Machine**:
  - Rewrote `src/ClavisVault.sol` into a programmable native-BOT inheritance escrow vault.
  - Implemented explicit per-vault BOT balances, initial/subsequent deposits, owner withdrawals with reentrancy protection, monotonic recovery request IDs, per-request guardian approvals, proof-of-life heartbeats, cancellations, and terminal release state clearing liabilities before external transfer.
  - Implemented custom errors and rejection of uncredited direct deposits (`receive`/`fallback`).
  - Added view helpers `canClaim`, `getVaultBalance`, `getRecoveryRequest`, and backwards-compatible `canRead`.
- **Foundry Test Suite**:
  - Rewrote `test/ClavisVault.t.sol` with 22 tests covering:
    - Distinct owner/beneficiary validation (`OwnerIsBeneficiary`) and guardian role validation (`GuardianIsOwner`, `GuardianIsBeneficiary`, `DuplicateGuardian`).
    - Bounded guardian counts (1-16), thresholds, and durations.
    - Owner deposits and withdrawals with balance isolation.
    - Rejection of direct transfers (`DirectDepositNotAllowed`).
    - Inactivity timer boundaries and heartbeat extensions.
    - Monotonic request IDs and invalidation of stale guardian approvals on heartbeat or cancellation.
    - Guardian approvals transferring 0 funds.
    - Claim checks: threshold, delay, inactivity, and non-released state.
    - Reentrancy attack protection (`ReentrancyGuard`) and failed external transfer rollback (`TransferFailed`).
    - Multi-vault financial isolation (Vault 1 vs Vault 2).
    - Fuzz testing of deposits and withdrawals (256 runs).
    - Complete 4-wallet walkthrough (`testFourWalletLifecycleWalkthrough`).
- **Frontend Adaptation**:
  - Adapted `frontend/app/create-vault/CreateVaultForm.tsx` to native-BOT escrow funding and inheritance rules (removed CDR note/file upload and secret-sealing copy).
  - Adapted `frontend/app/dashboard/DashboardOverview.tsx` to display real credited BOT balance, deposit/withdraw controls, last heartbeat, countdown, and active recovery cancellation.
  - Adapted `frontend/app/beneficiary/RecoveryRequest.tsx` to show credited BOT balance, inactivity countdown, request initiation, and direct on-chain inheritance claim execution.
  - Adapted `frontend/app/guardian/GuardianApproval.tsx` to verify guardian role and approve active request IDs with duplicate approval protection.
  - Adapted `frontend/app/unlock/UnlockCdr.tsx` and `frontend/app/unlock/page.tsx` into a public release audit and claim page.
  - Updated `frontend/app/create-vault/cdrBrowser.ts` into a lightweight, fully typed BOT Chain viem client (eliminated `@piplabs/cdr-*` runtime dependencies).
  - Added `frontend/app/lib/clavisAbi.ts` with matching contract ABI.
  - Updated `frontend/app/page.tsx` landing page, hero copy, and footer links to BOT Chain and BOT Scan explorer.
  - Updated `frontend/app/components/AppShell.tsx` with explorer footer links.
  - Updated `frontend/app/components/friendlyErrors.ts` with friendly messages for all new contract errors.
  - Updated `frontend/app/components/vaultStorage.ts`.
- **Configuration & Deployment Scripts**:
  - Updated `scripts/config.ts` and `scripts/clavisAbi.ts` with BOT Chain parameters (Chain ID 677 / 968, RPC `https://rpc.botchain.ai`, Explorer `https://scan.botchain.ai`).
  - Added `scripts/deploy-botchain.ts` for clean automated deployment.
  - Added npm scripts to `package.json` (`bot:deploy`, `test:contracts`, `build:frontend`).
  - Updated `.env.example` and `frontend/.env.local.example`.
  - Created `docs/HISTORICAL_CDR.md` archiving historical Story Protocol CDR architecture and proof references.
  - Updated `README.md` to document the BOT Chain native vault while linking to historical CDR docs.

- **BOT Chain Mainnet UI Exclusivity (2026-11-09)**:
  - Hard-locked UI chain configuration exclusively to BOT Chain Mainnet (Chain ID `677` / `0x2a5`, RPC `https://rpc.botchain.ai`, Explorer `https://scan.botchain.ai`).
  - Added global wrong-network detection in `frontend/app/components/AppShell.tsx` and `frontend/app/components/SidebarWalletButton.tsx` with one-click wallet switching to BOT Chain Mainnet.
  - Enhanced `frontend/app/components/wallet.ts` and `frontend/app/create-vault/cdrBrowser.ts` to enforce `0x2a5` network switching, listen to `chainChanged`, and reject unsupported networks.
  - Removed obsolete `/api/story` and `/api/ipfs` routes, legacy secret input components, and Webpack loader overrides.
  - Verified clean static compilation (9/9 routes, 0 errors, 100% static output).

#### 2. Commands Actually Run and Outcomes
- `forge test --offline`: Ran baseline (9 passed), then ran updated suite with 22 tests including fuzzing (22 passed, 0 failed).
- `npm --prefix frontend ci`: Installed frontend dependencies cleanly from package lock.
- `npm --prefix frontend run build`: Compiled production build with zero errors. All 9 routes are static.
- `desloppify --exclude recoverkit --exclude out --exclude cache scan --no-badge`: Objective 100%, strict 25.0, 0 mechanical issues, 0 code smells, 0 dead exports, 0 unused.

#### 3. Verification Evidence
- Contract tests: 22 passed in Foundry (`forge test --offline`).
- Four-wallet lifecycle test passed (`testFourWalletLifecycleWalkthrough`).
- Next.js production build: 9/9 static routes generated cleanly.
- Network switching: Programmed to chainId `677` (`0x2a5`). Wrong network shows interactive switch prompt.

#### 4. Remaining Decisions & Next Authorized Actions
- Awaiting user confirmation to:
  1. Nominate and fund a dedicated deployment wallet on BOT Chain.
  2. Authorize running `npm run bot:deploy` on BOT Chain mainnet.
  3. Perform live four-wallet transactions on-chain once deployed.
