"use client";

import { initWasm } from "@piplabs/cdr-crypto";
import { Observer } from "@piplabs/cdr-sdk/dist/observer.js";
import { Uploader } from "@piplabs/cdr-sdk/dist/uploader.js";
import { Consumer } from "@piplabs/cdr-sdk/dist/consumer.js";
import { uuidToLabel } from "@piplabs/cdr-sdk/dist/label.js";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  encodeAbiParameters,
  http,
  parseEventLogs,
  toHex,
} from "viem";
import type { Abi, Address, Hex } from "viem";

const clavisAddress = (process.env.NEXT_PUBLIC_CLAVIS_CONTRACT_ADDRESS ??
  "0x3948d6ac6575526e61f00979124003319d849cd0") as Address;
export const activeClavisAddress = clavisAddress;

const storyApiUrl = process.env.NEXT_PUBLIC_STORY_API_URL ?? "/api/story";
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "https://aeneid.storyrpc.io";

export const storyAeneid = defineChain({
  id: 1315,
  name: "Story Aeneid",
  nativeCurrency: {
    decimals: 18,
    name: "IP",
    symbol: "IP",
  },
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
  },
});

const clavisAbi = [
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
    name: "cancelRecovery",
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
    type: "event",
    name: "RecoveryCancelled",
    inputs: [
      { name: "vaultId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
    ],
    anonymous: false,
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
  {
    type: "function",
    name: "getVault",
    stateMutability: "view",
    inputs: [{ name: "vaultId", type: "uint256" }],
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
          { name: "active", type: "bool" },
          { name: "cdrRef", type: "string" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getGuardians",
    stateMutability: "view",
    inputs: [{ name: "vaultId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "getRecovery",
    stateMutability: "view",
    inputs: [{ name: "vaultId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "requested", type: "bool" },
          { name: "cancelled", type: "bool" },
          { name: "requestedAt", type: "uint40" },
          { name: "approvalCount", type: "uint16" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "isGuardian",
    stateMutability: "view",
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "guardian", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "hasApproved",
    stateMutability: "view",
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "guardian", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
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
      { name: "cdrRef", type: "string", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CdrRefUpdated",
    inputs: [
      { name: "vaultId", type: "uint256", indexed: true },
      { name: "cdrRef", type: "string", indexed: false },
    ],
    anonymous: false,
  },
] as const satisfies Abi;

type CdrPayload = {
  kind: "text" | "file" | "external-file";
  name?: string;
  mimeType?: string;
  cid?: string;
  keyHex?: string;
  ivHex?: string;
  gatewayUrl?: string;
  encryptedSize?: number;
  originalSize?: number;
  bytes: Uint8Array;
};

type VaultCreatedEvent = {
  args: {
    vaultId?: bigint;
    beneficiary?: Address;
    threshold?: number;
    unlockDelay?: number;
    heartbeatTimeout?: number;
    cdrRef?: string;
  };
  blockNumber: bigint;
};

export type DecodedCdrPayload = {
  metadata: {
    kind: "text" | "file" | "external-file";
    name?: string;
    mimeType?: string;
    cid?: string;
    keyHex?: string;
    ivHex?: string;
    gatewayUrl?: string;
    encryptedSize?: number;
    originalSize?: number;
    size: number;
  };
  bytes: Uint8Array;
};

function encodePayload(payload: CdrPayload) {
  const metadata = {
    kind: payload.kind,
    name: payload.name,
    mimeType: payload.mimeType,
    cid: payload.cid,
    keyHex: payload.keyHex,
    ivHex: payload.ivHex,
    gatewayUrl: payload.gatewayUrl,
    encryptedSize: payload.encryptedSize,
    originalSize: payload.originalSize,
    size: payload.bytes.length,
  };
  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
  const output = new Uint8Array(4 + metadataBytes.length + payload.bytes.length);
  new DataView(output.buffer).setUint32(0, metadataBytes.length, false);
  output.set(metadataBytes, 4);
  output.set(payload.bytes, 4 + metadataBytes.length);
  return output;
}

export function decodePayload(bytes: Uint8Array): DecodedCdrPayload {
  const metadataLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, false);
  const payloadStart = 4 + metadataLength;
  return {
    metadata: JSON.parse(new TextDecoder().decode(bytes.slice(4, payloadStart))),
    bytes: bytes.slice(payloadStart),
  };
}

async function getWalletClients(account?: Address) {
  if (!window.ethereum) throw new Error("No wallet found. Connect MetaMask, Rabby, or OKX Wallet.");
  const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as Address[];
  const activeAccount = account ?? accounts[0];
  if (!activeAccount) throw new Error("No wallet account returned.");

  const publicClient = createPublicClient({
    chain: storyAeneid,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account: activeAccount,
    chain: storyAeneid,
    transport: custom(window.ethereum),
  });

  await ensureStoryAeneid(walletClient);
  return { account: activeAccount, publicClient, walletClient };
}

async function getConnectedAccount() {
  if (!window.ethereum) return undefined;
  const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as Address[];
  return accounts[0];
}

function secondsToDuration(seconds: number) {
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

async function getCdrRefForVault(
  publicClient: ReturnType<typeof createPublicClient>,
  vaultId: bigint,
  fromBlock: bigint,
  fallback?: string,
) {
  const cdrRefEvents = await publicClient.getContractEvents({
    address: clavisAddress,
    abi: clavisAbi,
    eventName: "CdrRefUpdated",
    args: { vaultId },
    fromBlock,
    toBlock: "latest",
  });

  return cdrRefEvents.at(-1)?.args.cdrRef || fallback || "";
}

async function buildStoredVaultFromCreatedEvent(
  publicClient: ReturnType<typeof createPublicClient>,
  event: VaultCreatedEvent,
) {
  const vaultId = event.args.vaultId;
  if (vaultId === undefined) return null;

  const guardians = await publicClient.readContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "getGuardians",
    args: [vaultId],
  });

  const cdrRef = await getCdrRefForVault(publicClient, vaultId, event.blockNumber, event.args.cdrRef);
  const heartbeat = secondsToDuration(Number(event.args.heartbeatTimeout ?? 0));
  const unlockDelay = secondsToDuration(Number(event.args.unlockDelay ?? 0));

  return {
    vaultId: vaultId.toString(),
    uuid: cdrRef ? Number(cdrRef) : undefined,
    beneficiary: event.args.beneficiary?.toLowerCase(),
    guardians: guardians.map((guardian) => guardian.toLowerCase()),
    threshold: event.args.threshold ?? 2,
    heartbeatValue: heartbeat.value,
    heartbeatUnit: heartbeat.unit,
    unlockDelayValue: unlockDelay.value,
    unlockDelayUnit: unlockDelay.unit,
    createdAt: event.blockNumber.toString(),
  };
}

export async function loadLatestOwnerVaultFromChain() {
  if (!window.ethereum) return null;
  const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as Address[];
  const account = accounts[0];
  if (!account) return null;

  const publicClient = createPublicClient({
    chain: storyAeneid,
    transport: http(rpcUrl),
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
  if (!latest) return null;

  return buildStoredVaultFromCreatedEvent(publicClient, latest);
}

export async function loadLatestRecoveryVaultForConnectedWallet(role: "beneficiary" | "guardian") {
  const account = await getConnectedAccount();
  if (!account) return null;

  const publicClient = createPublicClient({
    chain: storyAeneid,
    transport: http(rpcUrl),
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

    return buildStoredVaultFromCreatedEvent(publicClient, event);
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
    chain: storyAeneid,
    transport: http(rpcUrl),
  });

  if (input.role === "beneficiary") {
    const vault = await publicClient.readContract({
      address: clavisAddress,
      abi: clavisAbi,
      functionName: "getVault",
      args: [input.vaultId],
    });
    const allowed = vault.beneficiary.toLowerCase() === account.toLowerCase();
    if (allowed) {
      const recovery = await publicClient.readContract({
        address: clavisAddress,
        abi: clavisAbi,
        functionName: "getRecovery",
        args: [input.vaultId],
      });
      if (recovery.requested && !recovery.cancelled) {
        return {
          allowed: false,
          account,
          reason: "Recovery has already been requested. Guardians can approve now.",
        };
      }
    }
    return {
      allowed,
      account,
      reason: allowed ? "" : "Only the named beneficiary can request recovery for this vault.",
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
  if (!recovery.requested || recovery.cancelled) {
    return {
      allowed: false,
      account,
      reason: "Recovery has not been requested yet. The beneficiary must request recovery first.",
    };
  }

  return {
    allowed: true,
    account,
    reason: "",
  };
}

export async function loadRecoveryReadiness(input: { vaultId: bigint }) {
  const publicClient = createPublicClient({
    chain: storyAeneid,
    transport: http(rpcUrl),
  });
  const [vault, recovery] = await Promise.all([
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
  ]);
  const lastHeartbeatAt = Number(vault.lastHeartbeatAt);
  const heartbeatTimeout = Number(vault.heartbeatTimeout);
  const inactiveAt = lastHeartbeatAt + heartbeatTimeout;
  const now = Math.floor(Date.now() / 1000);
  return {
    active: vault.active,
    heartbeatTimeout,
    lastHeartbeatAt,
    inactiveAt,
    secondsRemaining: Math.max(0, inactiveAt - now),
    expired: heartbeatTimeout > 0 && now >= inactiveAt,
    recoveryRequested: recovery.requested && !recovery.cancelled,
    approvalCount: Number(recovery.approvalCount),
    threshold: Number(vault.threshold),
  };
}

export async function loadRecoveryProgress(input: { vaultId: bigint }) {
  const publicClient = createPublicClient({
    chain: storyAeneid,
    transport: http(rpcUrl),
  });
  const [vault, recovery, guardians] = await Promise.all([
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
  ]);
  const approvals = await Promise.all(
    guardians.map(async (guardian) => ({
      guardian: guardian.toLowerCase(),
      approved: await publicClient.readContract({
        address: clavisAddress,
        abi: clavisAbi,
        functionName: "hasApproved",
        args: [input.vaultId, guardian],
      }),
    })),
  );

  return {
    threshold: Number(vault.threshold),
    requested: recovery.requested && !recovery.cancelled,
    approvalCount: Number(recovery.approvalCount),
    approvals,
  };
}

export async function cancelRecoveryOnChain(input: {
  vaultId: bigint;
  onStatus: (status: string) => void;
}) {
  input.onStatus("Preparing owner wallet and network...");
  const { publicClient, walletClient, account } = await getWalletClients();
  input.onStatus("Cancelling recovery request...");
  await publicClient.simulateContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "cancelRecovery",
    args: [input.vaultId],
    account,
  });
  const hash = await walletClient.writeContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "cancelRecovery",
    args: [input.vaultId],
    account,
    chain: storyAeneid,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Cancel recovery transaction failed.");
  return hash;
}

async function ensureStoryAeneid(walletClient: ReturnType<typeof createWalletClient>) {
  const currentChainId = await walletClient.getChainId();
  if (currentChainId === storyAeneid.id) return;

  try {
    await walletClient.switchChain({ id: storyAeneid.id });
  } catch {
    await walletClient.addChain({ chain: storyAeneid });
    await walletClient.switchChain({ id: storyAeneid.id });
  }
}

export async function sealVaultWithCdr(input: {
  account: Address;
  beneficiary: Address;
  guardians: Address[];
  threshold: number;
  unlockDelaySeconds: number;
  heartbeatTimeoutSeconds: number;
  payload: CdrPayload;
  onStatus: (status: string) => void;
}) {
  input.onStatus("Preparing wallet clients...");
  const { publicClient, walletClient } = await getWalletClients(input.account);

  input.onStatus("Creating Clavis vault...");
  const createHash = await walletClient.writeContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "createVault",
    args: [
      input.beneficiary,
      input.guardians,
      input.threshold,
      input.unlockDelaySeconds,
      input.heartbeatTimeoutSeconds,
      "",
    ],
    account: input.account,
    chain: storyAeneid,
  });
  const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
  if (createReceipt.status !== "success") throw new Error("Create vault transaction failed.");

  const createdLogs = parseEventLogs({
    abi: clavisAbi,
    eventName: "VaultCreated",
    logs: createReceipt.logs,
  });
  const vaultId = createdLogs[0]?.args.vaultId;
  if (vaultId === undefined) throw new Error("Could not read created vault ID from transaction logs.");

  input.onStatus("Initializing CDR encryption...");
  await initWasm();
  const observer = new Observer({
    network: "testnet",
    publicClient,
    apiUrl: storyApiUrl,
  });
  const uploader = new Uploader({
    network: "testnet",
    publicClient,
    walletClient,
    observer,
  });

  const conditionData = encodeAbiParameters([{ type: "uint256" }], [vaultId]);

  input.onStatus("Allocating CDR vault...");
  const globalPubKey = await observer.getGlobalPubKey();
  const { uuid, txHash: allocateTxHash } = await uploader.allocate({
    updatable: false,
    writeConditionAddr: clavisAddress,
    readConditionAddr: clavisAddress,
    writeConditionData: conditionData,
    readConditionData: conditionData,
    skipConditionValidation: false,
  });

  input.onStatus("Encrypting secret in browser...");
  const ciphertext = await uploader.encryptDataKey({
    dataKey: encodePayload(input.payload),
    globalPubKey,
    label: uuidToLabel(uuid),
  });

  input.onStatus("Writing encrypted payload to CDR...");
  const { txHash: writeTxHash } = await uploader.write({
    uuid,
    accessAuxData: "0x",
    encryptedData: toHex(ciphertext.raw),
  });

  input.onStatus("Linking CDR UUID to Clavis vault...");
  const setRefHash = await walletClient.writeContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "setCdrRef",
    args: [vaultId, String(uuid)],
    account: input.account,
    chain: storyAeneid,
  });
  const setRefReceipt = await publicClient.waitForTransactionReceipt({ hash: setRefHash });
  if (setRefReceipt.status !== "success") throw new Error("Set CDR reference transaction failed.");

  return {
    vaultId,
    uuid,
    createHash,
    allocateTxHash,
    writeTxHash,
    setRefHash,
  } satisfies {
    vaultId: bigint;
    uuid: number;
    createHash: Hex;
    allocateTxHash: Hex;
    writeTxHash: Hex;
    setRefHash: Hex;
  };
}

export async function requestRecoveryOnChain(input: {
  vaultId: bigint;
  onStatus: (status: string) => void;
}) {
  input.onStatus("Preparing wallet and network...");
  const { publicClient, walletClient, account } = await getWalletClients();
  input.onStatus("Requesting recovery...");
  await publicClient.simulateContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "requestRecovery",
    args: [input.vaultId],
    account,
  });
  const hash = await walletClient.writeContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "requestRecovery",
    args: [input.vaultId],
    account,
    chain: storyAeneid,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Recovery request transaction failed.");
  return hash;
}

export async function approveRecoveryOnChain(input: {
  vaultId: bigint;
  onStatus: (status: string) => void;
}) {
  input.onStatus("Preparing wallet and network...");
  const { publicClient, walletClient, account } = await getWalletClients();
  input.onStatus("Submitting guardian approval...");
  await publicClient.simulateContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "approveRecovery",
    args: [input.vaultId],
    account,
  });
  const hash = await walletClient.writeContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "approveRecovery",
    args: [input.vaultId],
    account,
    chain: storyAeneid,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Guardian approval transaction failed.");
  return hash;
}

export async function sendHeartbeatOnChain(input: {
  vaultId: bigint;
  onStatus: (status: string) => void;
}) {
  input.onStatus("Preparing wallet and network...");
  const { publicClient, walletClient, account } = await getWalletClients();
  input.onStatus("Sending proof-of-life heartbeat...");
  const hash = await walletClient.writeContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "heartbeat",
    args: [input.vaultId],
    account,
    chain: storyAeneid,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Heartbeat transaction failed.");
  return hash;
}

export async function unlockCdrVault(input: {
  vaultId: bigint;
  uuid: number;
  onStatus: (status: string) => void;
}) {
  input.onStatus("Preparing wallet and network...");
  const { publicClient, walletClient, account } = await getWalletClients();

  const canRead = await publicClient.readContract({
    address: clavisAddress,
    abi: clavisAbi,
    functionName: "canRead",
    args: [input.vaultId, account],
  });
  if (!canRead) {
    throw new Error("Clavis says this wallet cannot read yet. Complete request, guardian approvals, timeout, and final delay.");
  }

  input.onStatus("Initializing CDR read...");
  await initWasm();
  const observer = new Observer({
    network: "testnet",
    publicClient,
    apiUrl: storyApiUrl,
  });
  const consumer = new Consumer({
    network: "testnet",
    publicClient,
    walletClient,
    observer,
    apiUrl: storyApiUrl,
  });

  input.onStatus("Requesting validator partial decryptions...");
  const { dataKey, txHash } = await consumer.accessCDR({
    uuid: input.uuid,
    accessAuxData: "0x",
    timeoutMs: 120_000,
  });

  input.onStatus("CDR read complete.");
  return {
    txHash,
    payload: decodePayload(dataKey),
  };
}
