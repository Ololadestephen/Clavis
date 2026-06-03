import { CDRClient, uuidToLabel } from "@piplabs/cdr-sdk";
import { encodeAbiParameters, getAddress, toHex } from "viem";
import { clavisAbi } from "./clavisAbi.js";
import { createStoryClients, getRequiredPrivateKey } from "./cdrClient.js";

export const contractAddress = process.env.CLAVIS_CONTRACT_ADDRESS;
if (!contractAddress) {
  throw new Error("Missing CLAVIS_CONTRACT_ADDRESS. Run npm run cdr:deploy first, then add the address to .env.");
}

export const owner = await createStoryClients(getRequiredPrivateKey("OWNER_PRIVATE_KEY"));
export const beneficiary = await createStoryClients(getRequiredPrivateKey("BENEFICIARY_PRIVATE_KEY"));
export const guardianOne = await createStoryClients(getRequiredPrivateKey("GUARDIAN_ONE_PRIVATE_KEY"));
export const guardianTwo = await createStoryClients(getRequiredPrivateKey("GUARDIAN_TWO_PRIVATE_KEY"));
export const guardianThree = await createStoryClients(getRequiredPrivateKey("GUARDIAN_THREE_PRIVATE_KEY"));

export const clavis = getAddress(contractAddress);
export const guardians = [guardianOne.account.address, guardianTwo.account.address, guardianThree.account.address];

type CdrPayload = {
  kind: "text" | "file";
  name?: string;
  mimeType?: string;
  bytes: Uint8Array;
};

function encodePayload(payload: CdrPayload) {
  const metadata = {
    kind: payload.kind,
    name: payload.name,
    mimeType: payload.mimeType,
    size: payload.bytes.length,
  };
  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
  const output = new Uint8Array(4 + metadataBytes.length + payload.bytes.length);
  new DataView(output.buffer).setUint32(0, metadataBytes.length, false);
  output.set(metadataBytes, 4);
  output.set(payload.bytes, 4 + metadataBytes.length);
  return output;
}

function decodePayload(bytes: Uint8Array) {
  const metadataLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, false);
  const metadataStart = 4;
  const payloadStart = metadataStart + metadataLength;
  const metadata = JSON.parse(new TextDecoder().decode(bytes.slice(metadataStart, payloadStart))) as {
    kind: "text" | "file";
    name?: string;
    mimeType?: string;
    size: number;
  };
  return {
    metadata,
    bytes: bytes.slice(payloadStart),
  };
}

export async function writeAndWait(hash: `0x${string}`, label: string) {
  console.log(`${label}:`, hash);
  const receipt = await owner.publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`${label} failed: ${hash}`);
  }
  return receipt;
}

export async function createClavisVault(input: {
  unlockDelaySeconds: number;
  heartbeatTimeoutSeconds: number;
}) {
  const { request } = await owner.publicClient.simulateContract({
    account: owner.account,
    address: clavis,
    abi: clavisAbi,
    functionName: "createVault",
    args: [
      beneficiary.account.address,
      guardians,
      2,
      input.unlockDelaySeconds,
      input.heartbeatTimeoutSeconds,
      "",
    ],
  });
  const hash = await owner.walletClient.writeContract(request);
  await writeAndWait(hash, "Create Clavis vault tx");

  const nextVaultId = await owner.publicClient.readContract({
    address: clavis,
    abi: clavisAbi,
    functionName: "nextVaultId",
  });
  const createdVaultId = nextVaultId - 1n;
  console.log("Clavis vault id:", createdVaultId.toString());
  return createdVaultId;
}

export async function uploadSecretToCdr(input: {
  cdr: CDRClient;
  vaultId: bigint;
  secret?: string;
  bytes?: Uint8Array;
  fileName?: string;
  mimeType?: string;
}) {
  const conditionData = encodeAbiParameters([{ type: "uint256" }], [input.vaultId]);
  const globalPubKey = await input.cdr.observer.getGlobalPubKey();

  const { uuid, txHash: allocateTx } = await input.cdr.uploader.allocate({
    updatable: false,
    writeConditionAddr: clavis,
    readConditionAddr: clavis,
    writeConditionData: conditionData,
    readConditionData: conditionData,
    skipConditionValidation: false,
  });
  console.log("CDR UUID:", uuid);
  console.log("CDR allocate tx:", allocateTx);

  const ciphertext = await input.cdr.uploader.encryptDataKey({
    dataKey: encodePayload({
      kind: input.fileName ? "file" : "text",
      name: input.fileName,
      mimeType: input.mimeType,
      bytes: input.bytes ?? new TextEncoder().encode(input.secret ?? ""),
    }),
    globalPubKey,
    label: uuidToLabel(uuid),
  });
  const { txHash: writeTx } = await input.cdr.uploader.write({
    uuid,
    accessAuxData: "0x",
    encryptedData: toHex(ciphertext.raw),
  });
  console.log("CDR write tx:", writeTx);

  const setRefHash = await owner.walletClient.writeContract({
    address: clavis,
    abi: clavisAbi,
    functionName: "setCdrRef",
    args: [input.vaultId, String(uuid)],
  });
  await writeAndWait(setRefHash, "Set CDR ref tx");

  return uuid;
}

export async function tryRead(input: {
  label: string;
  cdr: CDRClient;
  reader: `0x${string}`;
  uuid: number | bigint;
  vaultId: bigint;
}) {
  console.log(`\n${input.label}`);
  const canRead = await owner.publicClient.readContract({
    address: clavis,
    abi: clavisAbi,
    functionName: "canRead",
    args: [input.vaultId, input.reader],
  });
  console.log("Contract canRead:", canRead);

  try {
    const { dataKey, txHash } = await input.cdr.consumer.accessCDR({
      uuid: Number(input.uuid),
      accessAuxData: "0x",
      timeoutMs: 120_000,
    });
    console.log("CDR read tx:", txHash);
    const payload = decodePayload(dataKey);
    if (payload.metadata.kind === "file") {
      console.log("Recovered file:", payload.metadata.name ?? "sealed-file");
      console.log("Recovered file size:", payload.metadata.size);
      console.log("Recovered file type:", payload.metadata.mimeType ?? "application/octet-stream");
    } else {
      console.log("Recovered secret:", new TextDecoder().decode(payload.bytes));
    }
    return true;
  } catch (error) {
    console.log("CDR read denied/failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
