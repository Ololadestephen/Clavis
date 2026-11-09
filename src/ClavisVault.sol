// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ClavisVault
/// @notice Programmable native-BOT inheritance escrow vault with multi-party guardian approval,
/// proof-of-life heartbeats, and timelocked recovery execution.
contract ClavisVault {
    // ---------------------------------------------------------
    // Custom Errors
    // ---------------------------------------------------------
    error InvalidBeneficiary();
    error InvalidGuardian();
    error InvalidThreshold();
    error InvalidHeartbeatTimeout();
    error InvalidUnlockDelay();
    error DuplicateGuardian();
    error GuardianIsOwner();
    error GuardianIsBeneficiary();
    error OwnerIsBeneficiary();

    error InvalidVault();
    error VaultNotActive();
    error VaultAlreadyReleased();

    error NotOwner();
    error NotBeneficiary();
    error NotGuardian();

    error RecoveryAlreadyActive();
    error RecoveryNotActive();
    error InvalidRequestId();
    error AlreadyApproved();

    error InactivityPeriodNotElapsed();
    error DelayNotElapsed();
    error ThresholdNotMet();
    error NoFundsToRelease();
    error NoFundsToWithdraw();
    error InsufficientVaultBalance();
    error DirectDepositNotAllowed();
    error ZeroDeposit();
    error TransferFailed();
    error ReentrancyGuard();

    // ---------------------------------------------------------
    // Enums & Structs
    // ---------------------------------------------------------
    enum VaultStatus {
        NonExistent,
        Active,
        Released
    }

    struct VaultConfig {
        address owner;
        address beneficiary;
        uint16 threshold;
        uint40 unlockDelay;
        uint40 heartbeatTimeout;
        uint40 createdAt;
        uint40 lastHeartbeatAt;
        uint256 balance;
        VaultStatus status;
    }

    struct RecoveryRequestState {
        uint256 requestId;
        uint40 requestedAt;
        uint16 approvalCount;
        bool active;
        bool cancelled;
    }

    // ---------------------------------------------------------
    // Storage
    // ---------------------------------------------------------
    uint256 public nextVaultId = 1;
    uint256 private _reentrancyStatus;

    mapping(uint256 vaultId => VaultConfig) private vaults;
    mapping(uint256 vaultId => address[]) private vaultGuardians;
    mapping(uint256 vaultId => mapping(address guardian => bool)) public isGuardian;

    mapping(uint256 vaultId => uint256) public vaultCurrentRequestId;
    mapping(uint256 vaultId => mapping(uint256 requestId => RecoveryRequestState)) private recoveryRequests;
    mapping(uint256 vaultId => mapping(uint256 requestId => mapping(address guardian => bool))) public hasApproved;

    // ---------------------------------------------------------
    // Events
    // ---------------------------------------------------------
    event VaultCreated(
        uint256 indexed vaultId,
        address indexed owner,
        address indexed beneficiary,
        uint16 threshold,
        uint40 unlockDelay,
        uint40 heartbeatTimeout,
        uint256 initialDeposit
    );
    event Deposited(uint256 indexed vaultId, address indexed sender, uint256 amount);
    event Withdrawn(uint256 indexed vaultId, address indexed owner, uint256 amount);
    event Heartbeat(uint256 indexed vaultId, address indexed owner, uint40 timestamp);
    event RecoveryRequested(uint256 indexed vaultId, uint256 indexed requestId, address indexed beneficiary);
    event GuardianApproved(uint256 indexed vaultId, uint256 indexed requestId, address indexed guardian, uint16 approvalCount);
    event RecoveryCancelled(uint256 indexed vaultId, uint256 indexed requestId, address indexed owner);
    event VaultReleased(uint256 indexed vaultId, uint256 indexed requestId, address indexed beneficiary, uint256 amount);

    // ---------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------
    modifier nonReentrant() {
        if (_reentrancyStatus == 2) revert ReentrancyGuard();
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }

    modifier onlyExisting(uint256 vaultId) {
        if (vaults[vaultId].status == VaultStatus.NonExistent) revert InvalidVault();
        _;
    }

    modifier onlyOwner(uint256 vaultId) {
        if (msg.sender != vaults[vaultId].owner) revert NotOwner();
        _;
    }

    constructor() {
        _reentrancyStatus = 1;
    }

    // Reject uncredited transfers
    receive() external payable {
        revert DirectDepositNotAllowed();
    }

    fallback() external payable {
        revert DirectDepositNotAllowed();
    }

    // ---------------------------------------------------------
    // Core Vault Lifecycle
    // ---------------------------------------------------------

    /// @notice Create an isolated inheritance vault with an optional initial native BOT deposit.
    function createVault(
        address beneficiary,
        address[] calldata guardians,
        uint16 threshold,
        uint40 unlockDelay,
        uint40 heartbeatTimeout
    ) external payable nonReentrant returns (uint256 vaultId) {
        if (beneficiary == address(0)) revert InvalidBeneficiary();
        if (beneficiary == msg.sender) revert OwnerIsBeneficiary();
        if (guardians.length == 0 || guardians.length > 16) revert InvalidGuardian();
        if (threshold == 0 || threshold > guardians.length) revert InvalidThreshold();
        if (heartbeatTimeout == 0 || heartbeatTimeout > 3650 days) revert InvalidHeartbeatTimeout();
        if (unlockDelay > 365 days) revert InvalidUnlockDelay();

        vaultId = nextVaultId++;

        VaultConfig storage vault = vaults[vaultId];
        vault.owner = msg.sender;
        vault.beneficiary = beneficiary;
        vault.threshold = threshold;
        vault.unlockDelay = unlockDelay;
        vault.heartbeatTimeout = heartbeatTimeout;
        vault.createdAt = uint40(block.timestamp);
        vault.lastHeartbeatAt = uint40(block.timestamp);
        vault.status = VaultStatus.Active;

        if (msg.value > 0) {
            vault.balance = msg.value;
            emit Deposited(vaultId, msg.sender, msg.value);
        }

        for (uint256 i = 0; i < guardians.length; i++) {
            address guardian = guardians[i];
            if (guardian == address(0)) revert InvalidGuardian();
            if (guardian == msg.sender) revert GuardianIsOwner();
            if (guardian == beneficiary) revert GuardianIsBeneficiary();
            if (isGuardian[vaultId][guardian]) revert DuplicateGuardian();

            isGuardian[vaultId][guardian] = true;
            vaultGuardians[vaultId].push(guardian);
        }

        emit VaultCreated(vaultId, msg.sender, beneficiary, threshold, unlockDelay, heartbeatTimeout, msg.value);
    }

    /// @notice Deposit native BOT to an active vault.
    function deposit(uint256 vaultId) external payable nonReentrant onlyExisting(vaultId) {
        VaultConfig storage vault = vaults[vaultId];
        if (vault.status != VaultStatus.Active) revert VaultNotActive();
        if (msg.sender != vault.owner) revert NotOwner();
        if (msg.value == 0) revert ZeroDeposit();

        vault.balance += msg.value;
        emit Deposited(vaultId, msg.sender, msg.value);
    }

    /// @notice Owner withdraws deposited BOT before terminal release.
    function withdraw(uint256 vaultId, uint256 amount) external nonReentrant onlyExisting(vaultId) onlyOwner(vaultId) {
        VaultConfig storage vault = vaults[vaultId];
        if (vault.status != VaultStatus.Active) revert VaultNotActive();
        if (amount == 0) revert NoFundsToWithdraw();
        if (amount > vault.balance) revert InsufficientVaultBalance();

        vault.balance -= amount;
        emit Withdrawn(vaultId, msg.sender, amount);

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /// @notice Proof-of-life check-in that resets the inactivity timer and cancels any active recovery request.
    function heartbeat(uint256 vaultId) external onlyExisting(vaultId) onlyOwner(vaultId) {
        VaultConfig storage vault = vaults[vaultId];
        if (vault.status != VaultStatus.Active) revert VaultNotActive();

        vault.lastHeartbeatAt = uint40(block.timestamp);

        uint256 currentReqId = vaultCurrentRequestId[vaultId];
        if (currentReqId > 0) {
            RecoveryRequestState storage req = recoveryRequests[vaultId][currentReqId];
            if (req.active && !req.cancelled) {
                req.active = false;
                req.cancelled = true;
                emit RecoveryCancelled(vaultId, currentReqId, msg.sender);
            }
        }

        emit Heartbeat(vaultId, msg.sender, uint40(block.timestamp));
    }

    /// @notice Beneficiary requests inheritance recovery once owner inactivity period has elapsed.
    function requestRecovery(uint256 vaultId) external onlyExisting(vaultId) returns (uint256 requestId) {
        VaultConfig storage vault = vaults[vaultId];
        if (vault.status != VaultStatus.Active) revert VaultNotActive();
        if (msg.sender != vault.beneficiary) revert NotBeneficiary();

        if (block.timestamp < uint256(vault.lastHeartbeatAt) + uint256(vault.heartbeatTimeout)) {
            revert InactivityPeriodNotElapsed();
        }

        uint256 currentReqId = vaultCurrentRequestId[vaultId];
        if (currentReqId > 0) {
            RecoveryRequestState storage currentReq = recoveryRequests[vaultId][currentReqId];
            if (currentReq.active && !currentReq.cancelled) {
                revert RecoveryAlreadyActive();
            }
        }

        requestId = ++vaultCurrentRequestId[vaultId];
        RecoveryRequestState storage newReq = recoveryRequests[vaultId][requestId];
        newReq.requestId = requestId;
        newReq.requestedAt = uint40(block.timestamp);
        newReq.active = true;
        newReq.cancelled = false;
        newReq.approvalCount = 0;

        emit RecoveryRequested(vaultId, requestId, msg.sender);
    }

    /// @notice Guardian approves a specific recovery request ID.
    function approveRecovery(uint256 vaultId, uint256 requestId) public onlyExisting(vaultId) {
        VaultConfig storage vault = vaults[vaultId];
        if (vault.status != VaultStatus.Active) revert VaultNotActive();
        if (!isGuardian[vaultId][msg.sender]) revert NotGuardian();

        uint256 currentReqId = vaultCurrentRequestId[vaultId];
        if (requestId != currentReqId || requestId == 0) revert InvalidRequestId();

        RecoveryRequestState storage req = recoveryRequests[vaultId][requestId];
        if (!req.active || req.cancelled) revert RecoveryNotActive();
        if (hasApproved[vaultId][requestId][msg.sender]) revert AlreadyApproved();

        hasApproved[vaultId][requestId][msg.sender] = true;
        req.approvalCount += 1;

        emit GuardianApproved(vaultId, requestId, msg.sender, req.approvalCount);
    }

    /// @notice Convenience helper: Guardian approves the current active recovery request.
    function approveRecovery(uint256 vaultId) external {
        approveRecovery(vaultId, vaultCurrentRequestId[vaultId]);
    }

    /// @notice Owner cancels an active recovery request before release.
    function cancelRecovery(uint256 vaultId) external onlyExisting(vaultId) onlyOwner(vaultId) {
        VaultConfig storage vault = vaults[vaultId];
        if (vault.status != VaultStatus.Active) revert VaultNotActive();

        uint256 currentReqId = vaultCurrentRequestId[vaultId];
        if (currentReqId == 0) revert RecoveryNotActive();

        RecoveryRequestState storage req = recoveryRequests[vaultId][currentReqId];
        if (!req.active || req.cancelled) revert RecoveryNotActive();

        req.active = false;
        req.cancelled = true;

        emit RecoveryCancelled(vaultId, currentReqId, msg.sender);
    }

    /// @notice Beneficiary claims the vault BOT balance after approvals, inactivity, and delay requirements are satisfied.
    function claim(uint256 vaultId, uint256 requestId) public nonReentrant onlyExisting(vaultId) {
        VaultConfig storage vault = vaults[vaultId];
        if (vault.status != VaultStatus.Active) revert VaultNotActive();
        if (msg.sender != vault.beneficiary) revert NotBeneficiary();

        uint256 currentReqId = vaultCurrentRequestId[vaultId];
        if (requestId != currentReqId || requestId == 0) revert InvalidRequestId();

        RecoveryRequestState storage req = recoveryRequests[vaultId][requestId];
        if (!req.active || req.cancelled) revert RecoveryNotActive();

        if (req.approvalCount < vault.threshold) revert ThresholdNotMet();

        if (block.timestamp < uint256(vault.lastHeartbeatAt) + uint256(vault.heartbeatTimeout)) {
            revert InactivityPeriodNotElapsed();
        }

        if (block.timestamp < uint256(req.requestedAt) + uint256(vault.unlockDelay)) {
            revert DelayNotElapsed();
        }

        uint256 releaseAmount = vault.balance;
        if (releaseAmount == 0) revert NoFundsToRelease();

        // Checks-Effects-Interactions: Write terminal state and zero liability first
        vault.status = VaultStatus.Released;
        req.active = false;
        vault.balance = 0;

        emit VaultReleased(vaultId, requestId, msg.sender, releaseAmount);

        (bool success, ) = payable(vault.beneficiary).call{value: releaseAmount}("");
        if (!success) revert TransferFailed();
    }

    /// @notice Convenience helper: Beneficiary claims against the current active request.
    function claim(uint256 vaultId) external {
        claim(vaultId, vaultCurrentRequestId[vaultId]);
    }

    // ---------------------------------------------------------
    // View Functions & Eligibility Checks
    // ---------------------------------------------------------

    /// @notice Returns true if the vault is currently eligible to be claimed by the beneficiary.
    function canClaim(uint256 vaultId, address claimer) public view onlyExisting(vaultId) returns (bool) {
        VaultConfig storage vault = vaults[vaultId];
        if (vault.status != VaultStatus.Active) return false;
        if (claimer != vault.beneficiary) return false;
        if (vault.balance == 0) return false;

        uint256 currentReqId = vaultCurrentRequestId[vaultId];
        if (currentReqId == 0) return false;

        RecoveryRequestState storage req = recoveryRequests[vaultId][currentReqId];
        if (!req.active || req.cancelled) return false;
        if (req.approvalCount < vault.threshold) return false;
        if (block.timestamp < uint256(vault.lastHeartbeatAt) + uint256(vault.heartbeatTimeout)) return false;
        if (block.timestamp < uint256(req.requestedAt) + uint256(vault.unlockDelay)) return false;

        return true;
    }

    /// @notice Compatibility view returning claim status or owner access.
    function canRead(uint256 vaultId, address reader) external view returns (bool) {
        if (vaults[vaultId].status == VaultStatus.NonExistent) revert InvalidVault();
        if (reader == vaults[vaultId].owner) return true;
        return canClaim(vaultId, reader);
    }

    function getVault(uint256 vaultId) external view onlyExisting(vaultId) returns (VaultConfig memory) {
        return vaults[vaultId];
    }

    function getRecovery(uint256 vaultId) external view onlyExisting(vaultId) returns (RecoveryRequestState memory) {
        uint256 currentReqId = vaultCurrentRequestId[vaultId];
        return recoveryRequests[vaultId][currentReqId];
    }

    function getRecoveryRequest(uint256 vaultId, uint256 requestId) external view onlyExisting(vaultId) returns (RecoveryRequestState memory) {
        return recoveryRequests[vaultId][requestId];
    }

    function getGuardians(uint256 vaultId) external view onlyExisting(vaultId) returns (address[] memory) {
        return vaultGuardians[vaultId];
    }

    function getVaultBalance(uint256 vaultId) external view onlyExisting(vaultId) returns (uint256) {
        return vaults[vaultId].balance;
    }
}
