"use client";

import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  formatEther,
  http,
  parseEther,
  parseEventLogs,
} from "viem";
import type { Address, Hex } from "viem";
import { clavisAbi } from "../lib/clavisAbi";
import {
  BOTCHAIN_MAINNET_CHAIN_ID,
  BOTCHAIN_MAINNET_CHAIN_ID_HEX,
  BOTCHAIN_MAINNET_EXPLORER,
  BOTCHAIN_MAINNET_NAME,
  BOTCHAIN_MAINNET_RPC,
  switchNetworkToBotChainMainnet,
} from "../components/wallet";

// BOT Chain Mainnet Configuration
export const configuredChainId = BOTCHAIN_MAINNET_CHAIN_ID;
export const rpcUrl = BOTCHAIN_MAINNET_RPC;
export const explorerUrl = BOTCHAIN_MAINNET_EXPLORER;
export const networkName = BOTCHAIN_MAINNET_NAME;

export const botChain = defineChain({
  id: BOTCHAIN_MAINNET_CHAIN_ID,
  name: BOTCHAIN_MAINNET_NAME,
  nativeCurrency: {
    decimals: 18,
    name: "BOT",
    symbol: "BOT",
  },
  rpcUrls: {
    default: {
      http: [BOTCHAIN_MAINNET_RPC],
    },
  },
  blockExplorers: {
    default: {
      name: "BOT Scan",
      url: BOTCHAIN_MAINNET_EXPLORER,
    },
  },
});

// Alias for backwards compatibility
export const storyAeneid = botChain;

export const clavisAddress = (process.env.NEXT_PUBLIC_CLAVIS_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as Address;
export const activeClavisAddress = clavisAddress;

export { clavisAbi };

export type DecodedCdrPayload = {
  metadata: {
    kind: "text" | "file" | "external-file";
    name?: string;
    mimeType?: string;
    size: number;
  };
  bytes: Uint8Array;
};

export async function ensureBotChain() {
  await switchNetworkToBotChainMainnet();
}

export async function getWalletClients(account?: Address) {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected wallet found. Install MetaMask, Rabby, or OKX Wallet.");
  }
  const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as Address[];
  const activeAccount = account ?? accounts[0];
  if (!activeAccount) throw new Error("No wallet account returned.");

  // Strictly enforce BOT Chain Mainnet (Chain ID 677)
  await ensureBotChain();

  const publicClient = createPublicClient({
    chain: botChain,
    transport: http(BOTCHAIN_MAINNET_RPC),
  });
  const walletClient = createWalletClient({
    account: activeAccount,
    chain: botChain,
    transport: custom(window.ethereum),
  });

  return { account: activeAccount, publicClient, walletClient };
}

export async function getConnectedAccount(): Promise<Address | undefined> {
  if (typeof window === "undefined" || !window.ethereum) return undefined;
  const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as Address[];
  return accounts[0];
}

export function secondsToDuration(seconds: number) {
  const units = [
    ["years", 365 * 24 * 60 * 60],
    ["months", 30 * 24 * 60 * 60],
    ["days", 24 * 60 * 60],
    ["hours", 60 * 60],
    ["minutes", 60],
  ] as const;
  for (const [unit, unitSeconds] of units) {
    if (seconds >= unitSeconds && seconds % unitSeconds === 0) {
      return { value: seconds / unitSeconds, unit };
    }
  }
  return { value: seconds, unit: "seconds" };
}

export async function createVaultOnChain(input: {
  beneficiary: Address;
  guardians: Address[];
  threshold: number;
  unlockDelaySeconds: number;
  heartbeatTimeoutSeconds: number;
  initialDepositEther?: string;
  onStatus: (status: string) => void;
}) {
  input.onStatus("Verifying BOT Chain Mainnet and preparing wallet...");
  const { publicClient, walletClient, account } = await getWalletClients();

  const depositValue = input.initialDepositEther && Number(input.initialDepositEther) > 0
    ? parseEther(input.initialDepositEther)
    : BigInt(0);

  input.onStatus("Submitting createVault transaction to BOT Chain Mainnet...");
  const hash = await walletClient.writeContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "createVault",
    args: [
      input.beneficiary,
      input.guardians,
      input.threshold,
      input.unlockDelaySeconds,
      input.heartbeatTimeoutSeconds,
    ],
    value: depositValue,
    account,
    chain: botChain,
  });

  input.onStatus("Waiting for confirmation on BOT Chain Mainnet...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Create vault transaction failed.");

  const logs = parseEventLogs({
    abi: clavisAbi,
    eventName: "VaultCreated",
    logs: receipt.logs,
  });
  const vaultId = logs[0]?.args.vaultId;
  if (vaultId === undefined) throw new Error("Could not find created vault ID in transaction receipt logs.");

  return {
    vaultId,
    hash,
    createHash: hash,
  };
}

// Backwards-compatible alias for createVaultOnChain
export async function sealVaultWithCdr(input: {
  account: Address;
  beneficiary: Address;
  guardians: Address[];
  threshold: number;
  unlockDelaySeconds: number;
  heartbeatTimeoutSeconds: number;
  initialDepositEther?: string;
  payload?: unknown;
  onStatus: (status: string) => void;
}) {
  const result = await createVaultOnChain({
    beneficiary: input.beneficiary,
    guardians: input.guardians,
    threshold: input.threshold,
    unlockDelaySeconds: input.unlockDelaySeconds,
    heartbeatTimeoutSeconds: input.heartbeatTimeoutSeconds,
    initialDepositEther: input.initialDepositEther,
    onStatus: input.onStatus,
  });

  return {
    vaultId: result.vaultId,
    uuid: Number(result.vaultId),
    createHash: result.hash,
    allocateTxHash: result.hash,
    writeTxHash: result.hash,
    setRefHash: result.hash,
  };
}

export async function depositToVaultOnChain(input: {
  vaultId: bigint;
  amountEther: string;
  onStatus: (status: string) => void;
}) {
  input.onStatus("Verifying BOT Chain Mainnet and preparing wallet...");
  const { publicClient, walletClient, account } = await getWalletClients();

  const value = parseEther(input.amountEther);
  input.onStatus(`Depositing ${input.amountEther} BOT into Vault #${input.vaultId.toString()}...`);
  const hash = await walletClient.writeContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "deposit",
    args: [input.vaultId],
    value,
    account,
    chain: botChain,
  });

  input.onStatus("Waiting for deposit confirmation on BOT Chain Mainnet...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Deposit transaction failed.");
  return hash;
}

export async function withdrawFromVaultOnChain(input: {
  vaultId: bigint;
  amountEther: string;
  onStatus: (status: string) => void;
}) {
  input.onStatus("Verifying BOT Chain Mainnet and preparing wallet...");
  const { publicClient, walletClient, account } = await getWalletClients();

  const value = parseEther(input.amountEther);
  input.onStatus(`Withdrawing ${input.amountEther} BOT from Vault #${input.vaultId.toString()}...`);
  const hash = await walletClient.writeContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "withdraw",
    args: [input.vaultId, value],
    account,
    chain: botChain,
  });

  input.onStatus("Waiting for withdrawal confirmation on BOT Chain Mainnet...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Withdrawal transaction failed.");
  return hash;
}

export async function sendHeartbeatOnChain(input: {
  vaultId: bigint;
  onStatus: (status: string) => void;
}) {
  input.onStatus("Verifying BOT Chain Mainnet and preparing wallet...");
  const { publicClient, walletClient, account } = await getWalletClients();
  input.onStatus("Sending proof-of-life heartbeat to BOT Chain Mainnet...");
  const hash = await walletClient.writeContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "heartbeat",
    args: [input.vaultId],
    account,
    chain: botChain,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Heartbeat transaction failed.");
  return hash;
}

export async function cancelRecoveryOnChain(input: {
  vaultId: bigint;
  onStatus: (status: string) => void;
}) {
  input.onStatus("Verifying BOT Chain Mainnet and preparing wallet...");
  const { publicClient, walletClient, account } = await getWalletClients();
  input.onStatus("Cancelling recovery request on BOT Chain Mainnet...");
  const hash = await walletClient.writeContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "cancelRecovery",
    args: [input.vaultId],
    account,
    chain: botChain,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Cancel recovery transaction failed.");
  return hash;
}

export async function requestRecoveryOnChain(input: {
  vaultId: bigint;
  onStatus: (status: string) => void;
}) {
  input.onStatus("Verifying BOT Chain Mainnet and preparing wallet...");
  const { publicClient, walletClient, account } = await getWalletClients();
  input.onStatus("Requesting inheritance recovery on BOT Chain Mainnet...");
  const hash = await walletClient.writeContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "requestRecovery",
    args: [input.vaultId],
    account,
    chain: botChain,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Recovery request transaction failed.");
  return hash;
}

export async function approveRecoveryOnChain(input: {
  vaultId: bigint;
  requestId?: bigint;
  onStatus: (status: string) => void;
}) {
  input.onStatus("Verifying BOT Chain Mainnet and preparing wallet...");
  const { publicClient, walletClient, account } = await getWalletClients();
  input.onStatus("Submitting guardian approval on BOT Chain Mainnet...");

  let hash: Hex;
  if (input.requestId !== undefined) {
    hash = await walletClient.writeContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "approveRecovery",
      args: [input.vaultId, input.requestId],
      account,
      chain: botChain,
    });
  } else {
    hash = await walletClient.writeContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "approveRecovery",
      args: [input.vaultId],
      account,
      chain: botChain,
    });
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Guardian approval transaction failed.");
  return hash;
}

export async function claimInheritanceOnChain(input: {
  vaultId: bigint;
  requestId?: bigint;
  onStatus: (status: string) => void;
}) {
  input.onStatus("Verifying BOT Chain Mainnet and preparing wallet...");
  const { publicClient, walletClient, account } = await getWalletClients();
  input.onStatus("Executing inheritance claim and BOT payout on BOT Chain Mainnet...");

  let hash: Hex;
  if (input.requestId !== undefined) {
    hash = await walletClient.writeContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "claim",
      args: [input.vaultId, input.requestId],
      account,
      chain: botChain,
    });
  } else {
    hash = await walletClient.writeContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "claim",
      args: [input.vaultId],
      account,
      chain: botChain,
    });
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Inheritance claim transaction failed.");
  return hash;
}

export async function loadVaultOnChain(vaultId: bigint) {
  const publicClient = createPublicClient({
    chain: botChain,
    transport: http(BOTCHAIN_MAINNET_RPC),
  });

  const [vault, recovery, guardians, currentRequestId] = await Promise.all([
    publicClient.readContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "getVault",
      args: [vaultId],
    }),
    publicClient.readContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "getRecovery",
      args: [vaultId],
    }),
    publicClient.readContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "getGuardians",
      args: [vaultId],
    }),
    publicClient.readContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "vaultCurrentRequestId",
      args: [vaultId],
    }),
  ]);

  const heartbeat = secondsToDuration(Number(vault.heartbeatTimeout));
  const unlockDelay = secondsToDuration(Number(vault.unlockDelay));

  return {
    vaultId: vaultId.toString(),
    owner: vault.owner.toLowerCase(),
    beneficiary: vault.beneficiary.toLowerCase(),
    guardians: guardians.map((g) => g.toLowerCase()),
    threshold: Number(vault.threshold),
    balanceEther: formatEther(vault.balance),
    status: vault.status === 1 ? ("Active" as const) : vault.status === 2 ? ("Released" as const) : ("NonExistent" as const),
    heartbeatTimeout: Number(vault.heartbeatTimeout),
    lastHeartbeatAt: Number(vault.lastHeartbeatAt),
    createdAt: Number(vault.createdAt),
    heartbeatValue: heartbeat.value,
    heartbeatUnit: heartbeat.unit,
    unlockDelayValue: unlockDelay.value,
    unlockDelayUnit: unlockDelay.unit,
    currentRequestId: currentRequestId.toString(),
    recovery: {
      requestId: recovery.requestId.toString(),
      requestedAt: Number(recovery.requestedAt),
      approvalCount: Number(recovery.approvalCount),
      active: recovery.active,
      cancelled: recovery.cancelled,
    },
  };
}

export async function loadLatestOwnerVaultFromChain() {
  const account = await getConnectedAccount();
  if (!account) return null;

  const publicClient = createPublicClient({
    chain: botChain,
    transport: http(BOTCHAIN_MAINNET_RPC),
  });

  const createdEvents = await publicClient.getContractEvents({
    address: clavisAddress,
    abi: clavisAbi,
    eventName: "VaultCreated",
    args: { owner: account },
    fromBlock: BigInt(0),
    toBlock: "latest",
  });

  const latest = createdEvents.at(-1);
  if (!latest || latest.args.vaultId === undefined) return null;

  const vault = await loadVaultOnChain(latest.args.vaultId);
  return {
    vaultId: vault.vaultId,
    beneficiary: vault.beneficiary,
    guardians: vault.guardians,
    threshold: vault.threshold,
    balance: vault.balanceEther,
    status: vault.status,
    heartbeatValue: vault.heartbeatValue,
    heartbeatUnit: vault.heartbeatUnit,
    unlockDelayValue: vault.unlockDelayValue,
    unlockDelayUnit: vault.unlockDelayUnit,
    createdAt: vault.createdAt.toString(),
    lastHeartbeatAt: vault.lastHeartbeatAt.toString(),
  };
}

export async function loadLatestRecoveryVaultForConnectedWallet(role: "beneficiary" | "guardian") {
  const account = await getConnectedAccount();
  if (!account) return null;

  const publicClient = createPublicClient({
    chain: botChain,
    transport: http(BOTCHAIN_MAINNET_RPC),
  });

  const createdEvents = await publicClient.getContractEvents({
    address: clavisAddress,
    abi: clavisAbi,
    eventName: "VaultCreated",
    args: role === "beneficiary" ? { beneficiary: account } : undefined,
    fromBlock: BigInt(0),
    toBlock: "latest",
  });

  for (const event of [...createdEvents].reverse()) {
    const vaultId = event.args.vaultId;
    if (vaultId === undefined) continue;

    if (role === "guardian") {
      const isConnectedGuardian = await publicClient.readContract({
        address: clavisAddress,
        abi: clavisAbi,
        functionName: "isGuardian",
        args: [vaultId, account],
      });
      if (!isConnectedGuardian) continue;
    }

    const vault = await loadVaultOnChain(vaultId);
    return {
      vaultId: vault.vaultId,
      beneficiary: vault.beneficiary,
      guardians: vault.guardians,
      threshold: vault.threshold,
      balance: vault.balanceEther,
      status: vault.status,
      heartbeatValue: vault.heartbeatValue,
      heartbeatUnit: vault.heartbeatUnit,
      unlockDelayValue: vault.unlockDelayValue,
      unlockDelayUnit: vault.unlockDelayUnit,
    };
  }

  return null;
}

export async function checkRecoveryRole(input: {
  vaultId: bigint;
  role: "beneficiary" | "guardian";
}) {
  const account = await getConnectedAccount();
  if (!account) {
    return {
      allowed: false,
      account: undefined,
      reason: `Connect the ${input.role} wallet to continue.`,
    };
  }

  const publicClient = createPublicClient({
    chain: botChain,
    transport: http(BOTCHAIN_MAINNET_RPC),
  });

  if (input.role === "beneficiary") {
    const vault = await publicClient.readContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "getVault",
      args: [input.vaultId],
    });
    const isBeneficiary = vault.beneficiary.toLowerCase() === account.toLowerCase();
    if (!isBeneficiary) {
      return {
        allowed: false,
        account,
        reason: "Only the named beneficiary can request recovery or claim this vault.",
      };
    }
    const recovery = await publicClient.readContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "getRecovery",
      args: [input.vaultId],
    });
    if (recovery.active && !recovery.cancelled) {
      return {
        allowed: false,
        account,
        reason: "Recovery is already active for this vault.",
      };
    }
    return {
      allowed: true,
      account,
      reason: "Beneficiary wallet verified.",
    };
  }

  const allowed = await publicClient.readContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "isGuardian",
    args: [input.vaultId, account],
  });
  if (!allowed) {
    return {
      allowed: false,
      account,
      reason: "Only a listed guardian can approve recovery for this vault.",
    };
  }

  const recovery = await publicClient.readContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "getRecovery",
    args: [input.vaultId],
  });
  if (!recovery.active || recovery.cancelled) {
    return {
      allowed: false,
      account,
      reason: "Recovery has not been requested yet. The beneficiary must request recovery first.",
    };
  }

  return {
    allowed: true,
    account,
    reason: "Guardian wallet verified.",
  };
}

export async function loadRecoveryReadiness(input: { vaultId: bigint }) {
  const publicClient = createPublicClient({
    chain: botChain,
    transport: http(BOTCHAIN_MAINNET_RPC),
  });
  const [vault, recovery, currentRequestId] = await Promise.all([
    publicClient.readContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "getVault",
      args: [input.vaultId],
    }),
    publicClient.readContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "getRecovery",
      args: [input.vaultId],
    }),
    publicClient.readContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "vaultCurrentRequestId",
      args: [input.vaultId],
    }),
  ]);

  const lastHeartbeatAt = Number(vault.lastHeartbeatAt);
  const heartbeatTimeout = Number(vault.heartbeatTimeout);
  const inactiveAt = lastHeartbeatAt + heartbeatTimeout;
  const now = Math.floor(Date.now() / 1000);
  const unlockDelay = Number(vault.unlockDelay);
  const delayReleaseAt = Number(recovery.requestedAt) + unlockDelay;

  return {
    active: vault.status === 1,
    released: vault.status === 2,
    balanceEther: formatEther(vault.balance),
    heartbeatTimeout,
    lastHeartbeatAt,
    inactiveAt,
    secondsRemaining: Math.max(0, inactiveAt - now),
    expired: heartbeatTimeout > 0 && now >= inactiveAt,
    recoveryRequested: recovery.active && !recovery.cancelled,
    currentRequestId: currentRequestId.toString(),
    approvalCount: Number(recovery.approvalCount),
    threshold: Number(vault.threshold),
    unlockDelay,
    delaySecondsRemaining: Math.max(0, delayReleaseAt - now),
    delayElapsed: recovery.active && now >= delayReleaseAt,
  };
}

export async function loadRecoveryProgress(input: { vaultId: bigint }) {
  const publicClient = createPublicClient({
    chain: botChain,
    transport: http(BOTCHAIN_MAINNET_RPC),
  });
  const [vault, recovery, guardians, currentRequestId] = await Promise.all([
    publicClient.readContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "getVault",
      args: [input.vaultId],
    }),
    publicClient.readContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "getRecovery",
      args: [input.vaultId],
    }),
    publicClient.readContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "getGuardians",
      args: [input.vaultId],
    }),
    publicClient.readContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "vaultCurrentRequestId",
      args: [input.vaultId],
    }),
  ]);

  const approvals = await Promise.all(
    guardians.map(async (guardian) => ({
      guardian: guardian.toLowerCase(),
      approved: currentRequestId > BigInt(0)
        ? await publicClient.readContract({
            address: clavisAddress,
            abi: clavisAbi,
            functionName: "hasApproved",
            args: [input.vaultId, currentRequestId, guardian],
          })
        : false,
    })),
  );

  return {
    threshold: Number(vault.threshold),
    balanceEther: formatEther(vault.balance),
    status: vault.status === 1 ? ("Active" as const) : vault.status === 2 ? ("Released" as const) : ("NonExistent" as const),
    currentRequestId: currentRequestId.toString(),
    requested: recovery.active && !recovery.cancelled,
    approvalCount: Number(recovery.approvalCount),
    approvals,
  };
}

export async function unlockCdrVault(input: {
  vaultId: bigint;
  onStatus: (status: string) => void;
}) {
  input.onStatus("Checking inheritance claim eligibility on BOT Chain Mainnet...");
  const { publicClient, account } = await getWalletClients();

  const canClaim = await publicClient.readContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "canClaim",
    args: [input.vaultId, account],
  });

  if (!canClaim) {
    throw new Error(
      "Clavis says this wallet cannot claim yet. Verify that inactivity period has passed, guardian approvals meet threshold, and unlock delay has elapsed."
    );
  }

  input.onStatus("Claim eligibility verified. Executing on-chain inheritance claim on BOT Chain Mainnet...");
  const hash = await claimInheritanceOnChain({
    vaultId: input.vaultId,
    onStatus: input.onStatus,
  });

  input.onStatus("Inheritance payout confirmed on BOT Chain Mainnet!");
  return {
    txHash: hash,
    payload: {
      metadata: {
        kind: "text" as const,
        size: 0,
      },
      bytes: new Uint8Array(),
    },
  };
}
