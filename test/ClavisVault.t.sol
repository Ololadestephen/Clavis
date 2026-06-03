// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/ClavisVault.sol";

interface Vm {
    function expectRevert(bytes4 selector) external;
    function prank(address caller) external;
    function warp(uint256 timestamp) external;
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
    }

    function testDeniedDeniedUnlockedRecoveryPath() public {
        uint256 vaultId = createDefaultVault(1 days);
        bytes memory conditionData = abi.encode(vaultId);

        assertTrue(clavis.canRead(vaultId, owner));
        assertFalse(clavis.canRead(vaultId, beneficiary));
        assertFalse(clavis.checkReadCondition(1, "", conditionData, beneficiary));
        assertFalse(clavis.canRead(vaultId, stranger));
        assertTrue(clavis.checkWriteCondition(1, "", conditionData, owner));
        assertFalse(clavis.checkWriteCondition(1, "", conditionData, stranger));

        vm.prank(beneficiary);
        clavis.requestRecovery(vaultId);

        vm.prank(guardianOne);
        clavis.approveRecovery(vaultId);
        assertFalse(clavis.canRead(vaultId, beneficiary));

        vm.prank(guardianTwo);
        clavis.approveRecovery(vaultId);
        assertFalse(clavis.canRead(vaultId, beneficiary));

        vm.warp(block.timestamp + 1 days);
        assertTrue(clavis.canRead(vaultId, beneficiary));
        assertTrue(clavis.checkReadCondition(1, "", conditionData, beneficiary));
    }

    function testOwnerCanCancelRecovery() public {
        uint256 vaultId = createDefaultVault(0);

        vm.prank(beneficiary);
        clavis.requestRecovery(vaultId);

        vm.prank(guardianOne);
        clavis.approveRecovery(vaultId);
        vm.prank(guardianTwo);
        clavis.approveRecovery(vaultId);

        assertTrue(clavis.canRead(vaultId, beneficiary));

        vm.prank(owner);
        clavis.cancelRecovery(vaultId);

        assertFalse(clavis.canRead(vaultId, beneficiary));
    }

    function testOnlyBeneficiaryCanRequestRecovery() public {
        uint256 vaultId = createDefaultVault(0);

        vm.prank(stranger);
        vm.expectRevert(ClavisVault.NotBeneficiary.selector);
        clavis.requestRecovery(vaultId);
    }

    function testOnlyGuardiansCanApprove() public {
        uint256 vaultId = createDefaultVault(0);

        vm.prank(beneficiary);
        clavis.requestRecovery(vaultId);

        vm.prank(stranger);
        vm.expectRevert(ClavisVault.NotGuardian.selector);
        clavis.approveRecovery(vaultId);
    }

    function testGuardianCannotApproveTwice() public {
        uint256 vaultId = createDefaultVault(0);

        vm.prank(beneficiary);
        clavis.requestRecovery(vaultId);

        vm.prank(guardianOne);
        clavis.approveRecovery(vaultId);

        vm.prank(guardianOne);
        vm.expectRevert(ClavisVault.AlreadyApproved.selector);
        clavis.approveRecovery(vaultId);
    }

    function testHeartbeatTimeoutStillRequiresGuardianThreshold() public {
        uint256 vaultId = createDefaultVaultWithHeartbeat(0, 30 days);

        vm.prank(beneficiary);
        clavis.requestRecovery(vaultId);

        vm.warp(block.timestamp + 31 days);
        assertFalse(clavis.canRead(vaultId, beneficiary));

        vm.prank(guardianOne);
        clavis.approveRecovery(vaultId);
        assertFalse(clavis.canRead(vaultId, beneficiary));

        vm.prank(guardianTwo);
        clavis.approveRecovery(vaultId);
        assertTrue(clavis.canRead(vaultId, beneficiary));
    }

    function testHeartbeatTimeoutStillRequiresFinalDelay() public {
        uint256 vaultId = createDefaultVaultWithHeartbeat(1 hours, 3 hours);

        vm.warp(block.timestamp + 3 hours + 1);

        vm.prank(beneficiary);
        clavis.requestRecovery(vaultId);

        vm.prank(guardianOne);
        clavis.approveRecovery(vaultId);
        vm.prank(guardianTwo);
        clavis.approveRecovery(vaultId);

        assertFalse(clavis.canRead(vaultId, beneficiary));

        vm.warp(block.timestamp + 1 hours);
        assertTrue(clavis.canRead(vaultId, beneficiary));
    }

    function testRecoveryCannotBypassHeartbeatWithFinalDelay() public {
        uint256 vaultId = createDefaultVaultWithHeartbeat(1 hours, 3 hours);

        vm.prank(beneficiary);
        clavis.requestRecovery(vaultId);

        vm.prank(guardianOne);
        clavis.approveRecovery(vaultId);
        vm.prank(guardianTwo);
        clavis.approveRecovery(vaultId);

        vm.warp(block.timestamp + 1 hours);
        assertFalse(clavis.canRead(vaultId, beneficiary));

        vm.warp(block.timestamp + 2 hours);
        assertTrue(clavis.canRead(vaultId, beneficiary));
    }

    function testHeartbeatExtendsInactivityWindow() public {
        uint256 vaultId = createDefaultVaultWithHeartbeat(60 days, 30 days);

        vm.prank(beneficiary);
        clavis.requestRecovery(vaultId);

        vm.prank(guardianOne);
        clavis.approveRecovery(vaultId);
        vm.prank(guardianTwo);
        clavis.approveRecovery(vaultId);

        assertFalse(clavis.canRead(vaultId, beneficiary));

        vm.warp(block.timestamp + 20 days);
        vm.prank(owner);
        clavis.heartbeat(vaultId);

        vm.warp(block.timestamp + 11 days);
        assertFalse(clavis.canRead(vaultId, beneficiary));

        vm.warp(block.timestamp + 20 days);
        assertFalse(clavis.canRead(vaultId, beneficiary));

        vm.warp(block.timestamp + 9 days);
        assertTrue(clavis.canRead(vaultId, beneficiary));
    }

    function createDefaultVault(uint40 unlockDelay) private returns (uint256) {
        return createDefaultVaultWithHeartbeat(unlockDelay, 0);
    }

    function createDefaultVaultWithHeartbeat(uint40 unlockDelay, uint40 heartbeatTimeout) private returns (uint256) {
        address[] memory guardians = new address[](3);
        guardians[0] = guardianOne;
        guardians[1] = guardianTwo;
        guardians[2] = guardianThree;

        vm.prank(owner);
        return clavis.createVault(beneficiary, guardians, 2, unlockDelay, heartbeatTimeout, "cdr://clavis/demo-vault");
    }

    function assertTrue(bool value) private pure {
        require(value, "expected true");
    }

    function assertFalse(bool value) private pure {
        require(!value, "expected false");
    }
}
