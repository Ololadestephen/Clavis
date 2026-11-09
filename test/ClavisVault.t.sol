// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/ClavisVault.sol";

interface Vm {
    function expectRevert(bytes4 selector) external;
    function prank(address caller) external;
    function deal(address to, uint256 amount) external;
    function warp(uint256 timestamp) external;
    function assume(bool condition) external;
}

contract RejectingReceiver {
    receive() external payable {
        revert("Rejecting payment");
    }
}

contract ReentrantAttacker {
    ClavisVault public immutable vault;
    uint256 public targetVaultId;
    bool public hasAttacked;

    constructor(ClavisVault _vault) {
        vault = _vault;
    }

    function setTargetVaultId(uint256 _vaultId) external {
        targetVaultId = _vaultId;
    }

    receive() external payable {
        if (!hasAttacked) {
            hasAttacked = true;
            // Attempt to re-enter claim or withdraw
            vault.claim(targetVaultId);
        }
    }
}

contract ClavisVaultTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    ClavisVault private clavis;

    address private owner = address(0xA11CE);
    address private beneficiary = address(0xB0B);
    address private guardianOne = address(0x101);
    address private guardianTwo = address(0x102);
    address private guardianThree = address(0x103);
    address private stranger = address(0xBAD);

    function setUp() public {
        clavis = new ClavisVault();
        vm.deal(owner, 100 ether);
        vm.deal(beneficiary, 10 ether);
        vm.deal(stranger, 10 ether);
    }

    // -------------------------------------------------------------
    // Helper to create standard 3-guardian vault
    // -------------------------------------------------------------
    function createDefaultVault(uint40 unlockDelay, uint40 heartbeatTimeout, uint256 initialDeposit) internal returns (uint256) {
        address[] memory guardians = new address[](3);
        guardians[0] = guardianOne;
        guardians[1] = guardianTwo;
        guardians[2] = guardianThree;

        vm.prank(owner);
        return clavis.createVault{value: initialDeposit}(beneficiary, guardians, 2, unlockDelay, heartbeatTimeout);
    }

    // -------------------------------------------------------------
    // 1. Validation & Roles
    // -------------------------------------------------------------
    function testRejectZeroBeneficiary() public {
        address[] memory guardians = new address[](1);
        guardians[0] = guardianOne;

        vm.prank(owner);
        vm.expectRevert(ClavisVault.InvalidBeneficiary.selector);
        clavis.createVault(address(0), guardians, 1, 1 days, 30 days);
    }

    function testOwnerAndBeneficiaryMustBeDistinct() public {
        address[] memory guardians = new address[](1);
        guardians[0] = guardianOne;

        vm.prank(owner);
        vm.expectRevert(ClavisVault.OwnerIsBeneficiary.selector);
        clavis.createVault(owner, guardians, 1, 1 days, 30 days);
    }

    function testGuardianCannotBeOwnerOrBeneficiary() public {
        address[] memory guardians1 = new address[](1);
        guardians1[0] = owner;

        vm.prank(owner);
        vm.expectRevert(ClavisVault.GuardianIsOwner.selector);
        clavis.createVault(beneficiary, guardians1, 1, 1 days, 30 days);

        address[] memory guardians2 = new address[](1);
        guardians2[0] = beneficiary;

        vm.prank(owner);
        vm.expectRevert(ClavisVault.GuardianIsBeneficiary.selector);
        clavis.createVault(beneficiary, guardians2, 1, 1 days, 30 days);
    }

    function testRejectDuplicateGuardians() public {
        address[] memory guardians = new address[](2);
        guardians[0] = guardianOne;
        guardians[1] = guardianOne;

        vm.prank(owner);
        vm.expectRevert(ClavisVault.DuplicateGuardian.selector);
        clavis.createVault(beneficiary, guardians, 1, 1 days, 30 days);
    }

    function testBoundedGuardiansAndThreshold() public {
        address[] memory emptyGuardians = new address[](0);
        vm.prank(owner);
        vm.expectRevert(ClavisVault.InvalidGuardian.selector);
        clavis.createVault(beneficiary, emptyGuardians, 1, 1 days, 30 days);

        address[] memory guardians = new address[](2);
        guardians[0] = guardianOne;
        guardians[1] = guardianTwo;

        vm.prank(owner);
        vm.expectRevert(ClavisVault.InvalidThreshold.selector);
        clavis.createVault(beneficiary, guardians, 0, 1 days, 30 days);

        vm.prank(owner);
        vm.expectRevert(ClavisVault.InvalidThreshold.selector);
        clavis.createVault(beneficiary, guardians, 3, 1 days, 30 days);
    }

    function testBoundedDurations() public {
        address[] memory guardians = new address[](1);
        guardians[0] = guardianOne;

        vm.prank(owner);
        vm.expectRevert(ClavisVault.InvalidHeartbeatTimeout.selector);
        clavis.createVault(beneficiary, guardians, 1, 1 days, 0);

        vm.prank(owner);
        vm.expectRevert(ClavisVault.InvalidHeartbeatTimeout.selector);
        clavis.createVault(beneficiary, guardians, 1, 1 days, 3651 days);

        vm.prank(owner);
        vm.expectRevert(ClavisVault.InvalidUnlockDelay.selector);
        clavis.createVault(beneficiary, guardians, 1, 366 days, 30 days);
    }

    // -------------------------------------------------------------
    // 2. Fund Custody: Deposits, Withdrawals, Isolation
    // -------------------------------------------------------------
    function testInitialDepositAndOwnerWithdrawal() public {
        uint256 vaultId = createDefaultVault(1 days, 30 days, 10 ether);
        assertEq(clavis.getVaultBalance(vaultId), 10 ether);
        assertEq(address(clavis).balance, 10 ether);

        uint256 ownerBalBefore = owner.balance;
        vm.prank(owner);
        clavis.withdraw(vaultId, 4 ether);

        assertEq(clavis.getVaultBalance(vaultId), 6 ether);
        assertEq(owner.balance, ownerBalBefore + 4 ether);

        // Stranger cannot withdraw
        vm.prank(stranger);
        vm.expectRevert(ClavisVault.NotOwner.selector);
        clavis.withdraw(vaultId, 1 ether);

        // Cannot withdraw more than balance
        vm.prank(owner);
        vm.expectRevert(ClavisVault.InsufficientVaultBalance.selector);
        clavis.withdraw(vaultId, 10 ether);
    }

    function testDepositAdditionalFunds() public {
        uint256 vaultId = createDefaultVault(1 days, 30 days, 5 ether);

        vm.prank(owner);
        clavis.deposit{value: 3 ether}(vaultId);
        assertEq(clavis.getVaultBalance(vaultId), 8 ether);

        // Stranger cannot deposit
        vm.prank(stranger);
        vm.expectRevert(ClavisVault.NotOwner.selector);
        clavis.deposit{value: 1 ether}(vaultId);

        // Zero deposit reverts
        vm.prank(owner);
        vm.expectRevert(ClavisVault.ZeroDeposit.selector);
        clavis.deposit{value: 0}(vaultId);
    }

    function testDirectDepositReverts() public {
        vm.prank(owner);
        (bool ok, ) = address(clavis).call{value: 1 ether}("");
        require(!ok, "Direct deposit must revert");
    }

    function testMultipleVaultsFinanciallyIsolated() public {
        address owner2 = address(0xA22CE);
        address beneficiary2 = address(0xB22);
        vm.deal(owner2, 50 ether);

        uint256 v1 = createDefaultVault(1 days, 10 days, 10 ether);

        address[] memory g = new address[](1);
        g[0] = guardianOne;
        vm.prank(owner2);
        uint256 v2 = clavis.createVault{value: 20 ether}(beneficiary2, g, 1, 1 days, 10 days);

        assertEq(clavis.getVaultBalance(v1), 10 ether);
        assertEq(clavis.getVaultBalance(v2), 20 ether);
        assertEq(address(clavis).balance, 30 ether);

        // Owner 1 withdrawing does not affect Vault 2
        vm.prank(owner);
        clavis.withdraw(v1, 10 ether);
        assertEq(clavis.getVaultBalance(v1), 0 ether);
        assertEq(clavis.getVaultBalance(v2), 20 ether);

        // Owner 2 withdrawing does not affect Vault 1
        vm.prank(owner2);
        clavis.withdraw(v2, 5 ether);
        assertEq(clavis.getVaultBalance(v2), 15 ether);
    }

    // -------------------------------------------------------------
    // 3. Heartbeats and Timing Boundaries
    // -------------------------------------------------------------
    function testBeneficiaryCannotRequestBeforeInactivityPeriod() public {
        uint256 vaultId = createDefaultVault(1 days, 30 days, 5 ether);

        // Test label: Advancing 20 days is local test simulation of inactivity time
        vm.warp(block.timestamp + 20 days);

        vm.prank(beneficiary);
        vm.expectRevert(ClavisVault.InactivityPeriodNotElapsed.selector);
        clavis.requestRecovery(vaultId);
    }

    function testHeartbeatExtendsInactivityWindow() public {
        uint256 vaultId = createDefaultVault(1 days, 30 days, 5 ether);

        // At day 25, owner sends heartbeat
        vm.warp(block.timestamp + 25 days);
        vm.prank(owner);
        clavis.heartbeat(vaultId);

        // At day 40 (15 days after heartbeat), still cannot request
        vm.warp(block.timestamp + 15 days);
        vm.prank(beneficiary);
        vm.expectRevert(ClavisVault.InactivityPeriodNotElapsed.selector);
        clavis.requestRecovery(vaultId);

        // At day 56 (31 days after heartbeat), can request
        vm.warp(block.timestamp + 16 days);
        vm.prank(beneficiary);
        uint256 reqId = clavis.requestRecovery(vaultId);
        assertEq(reqId, 1);
    }

    // -------------------------------------------------------------
    // 4. Recovery Request, Approvals, Invalidation, and Stale State
    // -------------------------------------------------------------
    function testApprovalsBoundToRequestIdAndCannotSurviveHeartbeat() public {
        uint256 vaultId = createDefaultVault(1 days, 30 days, 5 ether);

        // Advance past inactivity period
        vm.warp(block.timestamp + 31 days);

        vm.prank(beneficiary);
        uint256 reqId1 = clavis.requestRecovery(vaultId);
        assertEq(reqId1, 1);

        // Guardian 1 approves req 1
        vm.prank(guardianOne);
        clavis.approveRecovery(vaultId, reqId1);

        // Owner check-in (heartbeat) invalidates req 1
        vm.prank(owner);
        clavis.heartbeat(vaultId);

        // Req 1 is now cancelled/invalidated
        ClavisVault.RecoveryRequestState memory reqState1 = clavis.getRecovery(vaultId);
        assertTrue(reqState1.cancelled);
        assertFalse(reqState1.active);

        // Guardian 2 cannot approve invalidated req 1
        vm.prank(guardianTwo);
        vm.expectRevert(ClavisVault.RecoveryNotActive.selector);
        clavis.approveRecovery(vaultId, reqId1);

        // Beneficiary cannot immediately re-request because heartbeat reset inactivity
        vm.prank(beneficiary);
        vm.expectRevert(ClavisVault.InactivityPeriodNotElapsed.selector);
        clavis.requestRecovery(vaultId);

        // Fast forward another 31 days
        vm.warp(block.timestamp + 31 days);
        vm.prank(beneficiary);
        uint256 reqId2 = clavis.requestRecovery(vaultId);
        assertEq(reqId2, 2);

        // Req 2 has 0 approvals! Guardian 1's approval for req 1 is completely stale
        ClavisVault.RecoveryRequestState memory reqState2 = clavis.getRecovery(vaultId);
        assertEq(reqState2.approvalCount, 0);
        assertFalse(clavis.hasApproved(vaultId, reqId2, guardianOne));

        // Guardian 1 can approve req 2 fresh
        vm.prank(guardianOne);
        clavis.approveRecovery(vaultId, reqId2);
        assertEq(clavis.getRecovery(vaultId).approvalCount, 1);
    }

    function testOwnerCanCancelRecoveryAndInvalidateApprovals() public {
        uint256 vaultId = createDefaultVault(1 days, 30 days, 5 ether);
        vm.warp(block.timestamp + 31 days);

        vm.prank(beneficiary);
        uint256 reqId = clavis.requestRecovery(vaultId);

        vm.prank(guardianOne);
        clavis.approveRecovery(vaultId, reqId);

        // Owner cancels
        vm.prank(owner);
        clavis.cancelRecovery(vaultId);

        ClavisVault.RecoveryRequestState memory reqState = clavis.getRecovery(vaultId);
        assertTrue(reqState.cancelled);
        assertFalse(reqState.active);

        // Guardians cannot approve cancelled request
        vm.prank(guardianTwo);
        vm.expectRevert(ClavisVault.RecoveryNotActive.selector);
        clavis.approveRecovery(vaultId, reqId);
    }

    function testGuardianCannotApproveTwiceForSameRequest() public {
        uint256 vaultId = createDefaultVault(1 days, 30 days, 5 ether);
        vm.warp(block.timestamp + 31 days);

        vm.prank(beneficiary);
        uint256 reqId = clavis.requestRecovery(vaultId);

        vm.prank(guardianOne);
        clavis.approveRecovery(vaultId, reqId);

        vm.prank(guardianOne);
        vm.expectRevert(ClavisVault.AlreadyApproved.selector);
        clavis.approveRecovery(vaultId, reqId);
    }

    function testNoGuardianActionDirectlySendsFunds() public {
        uint256 vaultId = createDefaultVault(1 days, 30 days, 5 ether);
        vm.warp(block.timestamp + 31 days);

        vm.prank(beneficiary);
        uint256 reqId = clavis.requestRecovery(vaultId);

        uint256 contractBalBefore = address(clavis).balance;
        uint256 g1BalBefore = guardianOne.balance;

        vm.prank(guardianOne);
        clavis.approveRecovery(vaultId, reqId);

        // Approving transfers 0 funds
        assertEq(address(clavis).balance, contractBalBefore);
        assertEq(guardianOne.balance, g1BalBefore);
    }

    // -------------------------------------------------------------
    // 5. Claim Execution, Threshold, Delays, Terminal State
    // -------------------------------------------------------------
    function testFullClaimLifecycle() public {
        uint256 vaultId = createDefaultVault(2 days, 30 days, 7 ether);

        // 1. Advance past inactivity
        vm.warp(block.timestamp + 31 days);

        // 2. Beneficiary requests recovery
        vm.prank(beneficiary);
        uint256 reqId = clavis.requestRecovery(vaultId);

        // 3. One approval is not enough (threshold = 2)
        vm.prank(guardianOne);
        clavis.approveRecovery(vaultId, reqId);

        assertFalse(clavis.canClaim(vaultId, beneficiary));
        vm.prank(beneficiary);
        vm.expectRevert(ClavisVault.ThresholdNotMet.selector);
        clavis.claim(vaultId, reqId);

        // 4. Second approval reaches threshold
        vm.prank(guardianTwo);
        clavis.approveRecovery(vaultId, reqId);

        // 5. Final unlock delay has not passed yet (2 days)
        assertFalse(clavis.canClaim(vaultId, beneficiary));
        vm.prank(beneficiary);
        vm.expectRevert(ClavisVault.DelayNotElapsed.selector);
        clavis.claim(vaultId, reqId);

        // 6. Fast forward 2 days
        vm.warp(block.timestamp + 2 days);
        assertTrue(clavis.canClaim(vaultId, beneficiary));

        // 7. Non-beneficiary cannot claim
        vm.prank(stranger);
        vm.expectRevert(ClavisVault.NotBeneficiary.selector);
        clavis.claim(vaultId, reqId);

        // 8. Beneficiary claims successfully
        uint256 benBalBefore = beneficiary.balance;
        vm.prank(beneficiary);
        clavis.claim(vaultId, reqId);

        assertEq(beneficiary.balance, benBalBefore + 7 ether);
        assertEq(clavis.getVaultBalance(vaultId), 0);

        // 9. Vault is in terminal released state
        ClavisVault.VaultConfig memory v = clavis.getVault(vaultId);
        assertTrue(v.status == ClavisVault.VaultStatus.Released);

        // 10. Cannot claim again
        vm.prank(beneficiary);
        vm.expectRevert(ClavisVault.VaultNotActive.selector);
        clavis.claim(vaultId, reqId);

        // 11. Cannot deposit into released vault
        vm.prank(owner);
        vm.expectRevert(ClavisVault.VaultNotActive.selector);
        clavis.deposit{value: 1 ether}(vaultId);

        // 12. Cannot withdraw from released vault
        vm.prank(owner);
        vm.expectRevert(ClavisVault.VaultNotActive.selector);
        clavis.withdraw(vaultId, 1 ether);

        // 13. Cannot heartbeat released vault
        vm.prank(owner);
        vm.expectRevert(ClavisVault.VaultNotActive.selector);
        clavis.heartbeat(vaultId);
    }

    // -------------------------------------------------------------
    // 6. Failed External Transfer Reverts State
    // -------------------------------------------------------------
    function testWhenTransferFailsTerminalStateReverts() public {
        RejectingReceiver rejectingBeneficiary = new RejectingReceiver();

        address[] memory guardians = new address[](1);
        guardians[0] = guardianOne;

        vm.prank(owner);
        uint256 vaultId = clavis.createVault{value: 5 ether}(address(rejectingBeneficiary), guardians, 1, 0, 1 days);

        vm.warp(block.timestamp + 2 days);

        vm.prank(address(rejectingBeneficiary));
        uint256 reqId = clavis.requestRecovery(vaultId);

        vm.prank(guardianOne);
        clavis.approveRecovery(vaultId, reqId);

        // Attempting to claim must fail because receiver rejects payment
        vm.prank(address(rejectingBeneficiary));
        vm.expectRevert(ClavisVault.TransferFailed.selector);
        clavis.claim(vaultId, reqId);

        // State remains active and funds are still credited (not lost or locked in terminal state)
        ClavisVault.VaultConfig memory v = clavis.getVault(vaultId);
        assertTrue(v.status == ClavisVault.VaultStatus.Active);
        assertEq(clavis.getVaultBalance(vaultId), 5 ether);
    }

    // -------------------------------------------------------------
    // 7. Reentrancy Protection
    // -------------------------------------------------------------
    function testReentrancyAttackPrevented() public {
        ReentrantAttacker attacker = new ReentrantAttacker(clavis);

        address[] memory guardians = new address[](1);
        guardians[0] = guardianOne;

        vm.prank(owner);
        uint256 vaultId = clavis.createVault{value: 5 ether}(address(attacker), guardians, 1, 0, 1 days);
        attacker.setTargetVaultId(vaultId);

        vm.warp(block.timestamp + 2 days);

        vm.prank(address(attacker));
        uint256 reqId = clavis.requestRecovery(vaultId);

        vm.prank(guardianOne);
        clavis.approveRecovery(vaultId, reqId);

        // When attacker receives payout, it re-enters clavis.claim()
        // The reentrant call fails with ReentrancyGuard, which reverts the transfer
        vm.prank(address(attacker));
        vm.expectRevert(ClavisVault.TransferFailed.selector);
        clavis.claim(vaultId, reqId);
    }

    // -------------------------------------------------------------
    // 8. Fuzzing: Vault Balance Isolation
    // -------------------------------------------------------------
    function testFuzzDepositsAndWithdrawals(uint96 amount1, uint96 amount2) public {
        vm.assume(amount1 > 0 && amount1 < 100 ether);
        vm.assume(amount2 > 0 && amount2 < 100 ether);

        vm.deal(owner, uint256(amount1) + uint256(amount2) + 10 ether);

        uint256 vaultId = createDefaultVault(1 days, 30 days, amount1);
        assertEq(clavis.getVaultBalance(vaultId), amount1);

        vm.prank(owner);
        clavis.deposit{value: amount2}(vaultId);
        assertEq(clavis.getVaultBalance(vaultId), uint256(amount1) + uint256(amount2));

        vm.prank(owner);
        clavis.withdraw(vaultId, amount1);
        assertEq(clavis.getVaultBalance(vaultId), amount2);
    }

    // -------------------------------------------------------------
    // 9. Backwards compatibility view canRead
    // -------------------------------------------------------------
    function testCanReadCompatibility() public {
        uint256 vaultId = createDefaultVault(1 days, 30 days, 5 ether);
        assertTrue(clavis.canRead(vaultId, owner));
        assertFalse(clavis.canRead(vaultId, beneficiary));
        assertFalse(clavis.canRead(vaultId, stranger));
    }

    // -------------------------------------------------------------
    // 10. Local Four-Wallet Walkthrough Invariant Test
    // -------------------------------------------------------------
    function testFourWalletLifecycleWalkthrough() public {
        address walletOwner = address(0x1111111111111111111111111111111111111111);
        address walletBeneficiary = address(0x2222222222222222222222222222222222222222);
        address walletGuardian1 = address(0x3333333333333333333333333333333333333333);
        address walletGuardian2 = address(0x4444444444444444444444444444444444444444);

        vm.deal(walletOwner, 20 ether);
        vm.deal(walletBeneficiary, 1 ether);

        // 1. Owner creates vault with 2 guardians and threshold 2
        address[] memory g = new address[](2);
        g[0] = walletGuardian1;
        g[1] = walletGuardian2;

        vm.prank(walletOwner);
        uint256 vaultId = clavis.createVault{value: 5 ether}(walletBeneficiary, g, 2, 1 days, 30 days);

        assertEq(clavis.getVaultBalance(vaultId), 5 ether);
        assertEq(address(clavis).balance, 5 ether);

        // 2. Owner deposits 2 more BOT
        vm.prank(walletOwner);
        clavis.deposit{value: 2 ether}(vaultId);
        assertEq(clavis.getVaultBalance(vaultId), 7 ether);

        // 3. 30 days elapse without heartbeat (test simulation)
        vm.warp(block.timestamp + 31 days);

        // 4. Beneficiary initiates recovery (Request #1)
        vm.prank(walletBeneficiary);
        uint256 reqId1 = clavis.requestRecovery(vaultId);
        assertEq(reqId1, 1);

        // 5. Guardian 1 approves
        vm.prank(walletGuardian1);
        clavis.approveRecovery(vaultId, reqId1);

        // 6. Owner wakes up and sends heartbeat, invalidating Request #1
        vm.prank(walletOwner);
        clavis.heartbeat(vaultId);

        // Guardian 2 cannot approve invalidated Request #1
        vm.prank(walletGuardian2);
        vm.expectRevert(ClavisVault.RecoveryNotActive.selector);
        clavis.approveRecovery(vaultId, reqId1);

        // 7. Another 31 days elapse without owner heartbeat
        vm.warp(block.timestamp + 31 days);

        // 8. Beneficiary initiates fresh recovery (Request #2)
        vm.prank(walletBeneficiary);
        uint256 reqId2 = clavis.requestRecovery(vaultId);
        assertEq(reqId2, 2);

        // Request #2 starts at 0 approvals
        ClavisVault.RecoveryRequestState memory req2 = clavis.getRecovery(vaultId);
        assertEq(req2.approvalCount, 0);

        // 9. Both guardians approve Request #2
        vm.prank(walletGuardian1);
        clavis.approveRecovery(vaultId, reqId2);

        vm.prank(walletGuardian2);
        clavis.approveRecovery(vaultId, reqId2);

        // 10. 1-day timelock delay passes
        vm.warp(block.timestamp + 1 days);
        assertTrue(clavis.canClaim(vaultId, walletBeneficiary));

        // 11. Beneficiary claims 7 BOT
        uint256 benBalBefore = walletBeneficiary.balance;
        vm.prank(walletBeneficiary);
        clavis.claim(vaultId, reqId2);

        assertEq(walletBeneficiary.balance, benBalBefore + 7 ether);
        assertEq(clavis.getVaultBalance(vaultId), 0);
        assertEq(address(clavis).balance, 0);

        // Terminal state confirmed
        ClavisVault.VaultConfig memory terminalVault = clavis.getVault(vaultId);
        assertTrue(terminalVault.status == ClavisVault.VaultStatus.Released);
    }

    // -------------------------------------------------------------
    // Helper assertions
    // -------------------------------------------------------------
    function assertEq(uint256 a, uint256 b) internal pure {
        require(a == b, "assertEq uint256 failed");
    }

    function assertEq(address a, address b) internal pure {
        require(a == b, "assertEq address failed");
    }

    function assertTrue(bool a) internal pure {
        require(a, "assertTrue failed");
    }

    function assertFalse(bool a) internal pure {
        require(!a, "assertFalse failed");
    }
}
