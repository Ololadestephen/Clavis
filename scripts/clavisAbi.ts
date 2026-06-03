export const clavisAbi = [
  {
    type: "function",
    name: "nextVaultId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "createVault",
    stateMutability: "nonpayable",
    inputs: [
      { name: "beneficiary", type: "address" },
      { name: "guardians", type: "address[]" },
      { name: "threshold", type: "uint16" },
      { name: "unlockDelay", type: "uint40" },
      { name: "heartbeatTimeout", type: "uint40" },
      { name: "cdrRef", type: "string" },
    ],
    outputs: [{ name: "vaultId", type: "uint256" }],
  },
  {
    type: "function",
    name: "setCdrRef",
    stateMutability: "nonpayable",
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "cdrRef", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "requestRecovery",
    stateMutability: "nonpayable",
    inputs: [{ name: "vaultId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "approveRecovery",
    stateMutability: "nonpayable",
    inputs: [{ name: "vaultId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "heartbeat",
    stateMutability: "nonpayable",
    inputs: [{ name: "vaultId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "canRead",
    stateMutability: "view",
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "reader", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
