// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ClavisVault
/// @notice On-chain permission engine for CDR-backed recovery vaults.
contract ClavisVault {
    error InvalidBeneficiary();
    error InvalidGuardian();
    error InvalidThreshold();
    error InvalidVault();
    error NotOwner();
    error NotBeneficiary();
    error NotGuardian();
    error VaultInactive();
    error RecoveryAlreadyRequested();
    error RecoveryNotRequested();
    error AlreadyApproved();
    error DuplicateGuardian();

    struct VaultConfig {
        address owner;
        address beneficiary;
        uint16 threshold;
        uint40 unlockDelay;
        uint40 heartbeatTimeout;
        uint40 createdAt;
        uint40 lastHeartbeatAt;
        bool active;
        string cdrRef;
    }

    struct RecoveryState {
        bool requested;
        bool cancelled;
        uint40 requestedAt;
        uint16 approvalCount;
    }

    uint256 public nextVaultId = 1;

    mapping(uint256 vaultId => VaultConfig) private vaults;
    mapping(uint256 vaultId => RecoveryState) private recoveries;
    mapping(uint256 vaultId => address[]) private vaultGuardians;
    mapping(uint256 vaultId => mapping(address guardian => bool)) public isGuardian;
    mapping(uint256 vaultId => mapping(address guardian => bool)) public hasApproved;

    event VaultCreated(
        uint256 indexed vaultId,
        address indexed owner,
        address indexed beneficiary,
        uint16 threshold,
        uint40 unlockDelay,
        uint40 heartbeatTimeout,
        string cdrRef
    );
    event RecoveryRequested(uint256 indexed vaultId, address indexed beneficiary);
    event GuardianApproved(uint256 indexed vaultId, address indexed guardian, uint16 approvalCount);
    event RecoveryCancelled(uint256 indexed vaultId, address indexed owner);
    event Heartbeat(uint256 indexed vaultId, address indexed owner, uint40 timestamp);
    event CdrRefUpdated(uint256 indexed vaultId, string cdrRef);

    modifier onlyExisting(uint256 vaultId) {
        if (vaults[vaultId].owner == address(0)) revert InvalidVault();
        _;
    }

    modifier onlyOwner(uint256 vaultId) {
        if (msg.sender != vaults[vaultId].owner) revert NotOwner();
        _;
    }

    function createVault(
        address beneficiary,
        address[] calldata guardians,
        uint16 threshold,
        uint40 unlockDelay,
        uint40 heartbeatTimeout,
        string calldata cdrRef
    ) external returns (uint256 vaultId) {
        if (beneficiary == address(0)) revert InvalidBeneficiary();
        if (guardians.length == 0 || guardians.length > type(uint16).max) revert InvalidGuardian();
        if (threshold == 0 || threshold > guardians.length) revert InvalidThreshold();

        vaultId = nextVaultId++;

        VaultConfig storage vault = vaults[vaultId];
        vault.owner = msg.sender;
        vault.beneficiary = beneficiary;
        vault.threshold = threshold;
        vault.unlockDelay = unlockDelay;
        vault.heartbeatTimeout = heartbeatTimeout;
        vault.createdAt = uint40(block.timestamp);
        vault.lastHeartbeatAt = uint40(block.timestamp);
        vault.active = true;
        vault.cdrRef = cdrRef;

        for (uint256 i = 0; i < guardians.length; i++) {
            address guardian = guardians[i];
            if (guardian == address(0)) revert InvalidGuardian();
            if (isGuardian[vaultId][guardian]) revert DuplicateGuardian();
            isGuardian[vaultId][guardian] = true;
            vaultGuardians[vaultId].push(guardian);
        }

        emit VaultCreated(vaultId, msg.sender, beneficiary, threshold, unlockDelay, heartbeatTimeout, cdrRef);
    }

    function setCdrRef(uint256 vaultId, string calldata cdrRef) external onlyExisting(vaultId) onlyOwner(vaultId) {
        vaults[vaultId].cdrRef = cdrRef;
        emit CdrRefUpdated(vaultId, cdrRef);
    }

    function requestRecovery(uint256 vaultId) external onlyExisting(vaultId) {
        VaultConfig storage vault = vaults[vaultId];
        if (!vault.active) revert VaultInactive();
        if (msg.sender != vault.beneficiary) revert NotBeneficiary();

        RecoveryState storage recovery = recoveries[vaultId];
        if (recovery.requested && !recovery.cancelled) revert RecoveryAlreadyRequested();

        recovery.requested = true;
        recovery.cancelled = false;
        recovery.requestedAt = uint40(block.timestamp);
        recovery.approvalCount = 0;

        address[] storage guardians = vaultGuardians[vaultId];
        for (uint256 i = 0; i < guardians.length; i++) {
            hasApproved[vaultId][guardians[i]] = false;
        }

        emit RecoveryRequested(vaultId, msg.sender);
    }

    function approveRecovery(uint256 vaultId) external onlyExisting(vaultId) {
        if (!isGuardian[vaultId][msg.sender]) revert NotGuardian();

        RecoveryState storage recovery = recoveries[vaultId];
        if (!recovery.requested || recovery.cancelled) revert RecoveryNotRequested();
        if (hasApproved[vaultId][msg.sender]) revert AlreadyApproved();

        hasApproved[vaultId][msg.sender] = true;
        recovery.approvalCount += 1;

        emit GuardianApproved(vaultId, msg.sender, recovery.approvalCount);
    }

    function cancelRecovery(uint256 vaultId) external onlyExisting(vaultId) onlyOwner(vaultId) {
        RecoveryState storage recovery = recoveries[vaultId];
        if (!recovery.requested || recovery.cancelled) revert RecoveryNotRequested();

        recovery.cancelled = true;
        emit RecoveryCancelled(vaultId, msg.sender);
    }

    function heartbeat(uint256 vaultId) external onlyExisting(vaultId) onlyOwner(vaultId) {
        vaults[vaultId].lastHeartbeatAt = uint40(block.timestamp);
        emit Heartbeat(vaultId, msg.sender, uint40(block.timestamp));
    }

    /// @notice Read gate used by CDR or any backend proxy before releasing a private payload.
    function canRead(uint256 vaultId, address reader) public view onlyExisting(vaultId) returns (bool) {
        VaultConfig storage vault = vaults[vaultId];
        if (!vault.active) return false;
        if (reader == vault.owner) return true;
        if (reader != vault.beneficiary) return false;

        RecoveryState storage recovery = recoveries[vaultId];
        bool ownerInactive = vault.heartbeatTimeout == 0 || block.timestamp >= vault.lastHeartbeatAt + vault.heartbeatTimeout;

        return recovery.requested && !recovery.cancelled && recovery.approvalCount >= vault.threshold
            && block.timestamp >= recovery.requestedAt + vault.unlockDelay && ownerInactive;
    }

    /// @notice CDR read condition entrypoint.
    /// @dev CDR passes the caller that requested decryption. conditionData must be abi.encode(vaultId).
    function checkReadCondition(uint32, bytes calldata, bytes calldata conditionData, address caller)
        external
        view
        returns (bool)
    {
        uint256 vaultId = abi.decode(conditionData, (uint256));
        return canRead(vaultId, caller);
    }

    /// @notice CDR write condition entrypoint for optional contract-based writes.
    /// @dev For Clavis, only the owner of the linked vault should be able to write/update encrypted data.
    function checkWriteCondition(uint32, bytes calldata, bytes calldata conditionData, address caller)
        external
        view
        returns (bool)
    {
        uint256 vaultId = abi.decode(conditionData, (uint256));
        return vaults[vaultId].owner == caller;
    }

    function getVault(uint256 vaultId) external view onlyExisting(vaultId) returns (VaultConfig memory) {
        return vaults[vaultId];
    }

    function getRecovery(uint256 vaultId) external view onlyExisting(vaultId) returns (RecoveryState memory) {
        return recoveries[vaultId];
    }

    function getGuardians(uint256 vaultId) external view onlyExisting(vaultId) returns (address[] memory) {
        return vaultGuardians[vaultId];
    }
}
