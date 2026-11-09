export const clavisAbi = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "fallback",
    stateMutability: "payable"
  },
  {
    type: "receive",
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "approveRecovery",
    inputs: [
      { name: "vaultId", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "approveRecovery",
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "requestId", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "canClaim",
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "claimer", type: "address" }
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "canRead",
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "reader", type: "address" }
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "cancelRecovery",
    inputs: [
      { name: "vaultId", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "claim",
    inputs: [
      { name: "vaultId", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "claim",
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "requestId", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "createVault",
    inputs: [
      { name: "beneficiary", type: "address" },
      { name: "guardians", type: "address[]" },
      { name: "threshold", type: "uint16" },
      { name: "unlockDelay", type: "uint40" },
      { name: "heartbeatTimeout", type: "uint40" }
    ],
    outputs: [{ name: "vaultId", type: "uint256" }],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "deposit",
    inputs: [
      { name: "vaultId", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "getGuardians",
    inputs: [
      { name: "vaultId", type: "uint256" }
    ],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getRecovery",
    inputs: [
      { name: "vaultId", type: "uint256" }
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "requestId", type: "uint256" },
          { name: "requestedAt", type: "uint40" },
          { name: "approvalCount", type: "uint16" },
          { name: "active", type: "bool" },
          { name: "cancelled", type: "bool" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getRecoveryRequest",
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "requestId", type: "uint256" }
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "requestId", type: "uint256" },
          { name: "requestedAt", type: "uint40" },
          { name: "approvalCount", type: "uint16" },
          { name: "active", type: "bool" },
          { name: "cancelled", type: "bool" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getVault",
    inputs: [
      { name: "vaultId", type: "uint256" }
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "beneficiary", type: "address" },
          { name: "threshold", type: "uint16" },
          { name: "unlockDelay", type: "uint40" },
          { name: "heartbeatTimeout", type: "uint40" },
          { name: "createdAt", type: "uint40" },
          { name: "lastHeartbeatAt", type: "uint40" },
          { name: "balance", type: "uint256" },
          { name: "status", type: "uint8" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getVaultBalance",
    inputs: [
      { name: "vaultId", type: "uint256" }
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "hasApproved",
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "requestId", type: "uint256" },
      { name: "guardian", type: "address" }
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "heartbeat",
    inputs: [
      { name: "vaultId", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "isGuardian",
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "guardian", type: "address" }
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "nextVaultId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "requestRecovery",
    inputs: [
      { name: "vaultId", type: "uint256" }
    ],
    outputs: [{ name: "requestId", type: "uint256" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "vaultCurrentRequestId",
    inputs: [
      { name: "vaultId", type: "uint256" }
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "event",
    name: "VaultCreated",
    inputs: [
      { name: "vaultId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "threshold", type: "uint16", indexed: false },
      { name: "unlockDelay", type: "uint40", indexed: false },
      { name: "heartbeatTimeout", type: "uint40", indexed: false },
      { name: "initialDeposit", type: "uint256", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "vaultId", type: "uint256", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "vaultId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Heartbeat",
    inputs: [
      { name: "vaultId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "timestamp", type: "uint40", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "RecoveryRequested",
    inputs: [
      { name: "vaultId", type: "uint256", indexed: true },
      { name: "requestId", type: "uint256", indexed: true },
      { name: "beneficiary", type: "address", indexed: true }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "GuardianApproved",
    inputs: [
      { name: "vaultId", type: "uint256", indexed: true },
      { name: "requestId", type: "uint256", indexed: true },
      { name: "guardian", type: "address", indexed: true },
      { name: "approvalCount", type: "uint16", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "RecoveryCancelled",
    inputs: [
      { name: "vaultId", type: "uint256", indexed: true },
      { name: "requestId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "VaultReleased",
    inputs: [
      { name: "vaultId", type: "uint256", indexed: true },
      { name: "requestId", type: "uint256", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ],
    anonymous: false
  }
] as const;
