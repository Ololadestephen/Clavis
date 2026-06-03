import { CDRClient, initWasm } from "@piplabs/cdr-sdk";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { aeneid, RPC_URL, STORY_API_URL } from "./config.js";

export type PrivateKey = `0x${string}`;

export function getRequiredPrivateKey(name: string): PrivateKey {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env or export it before running the script.`);
  }
  return value.startsWith("0x") ? (value as PrivateKey) : (`0x${value}` as PrivateKey);
}

export async function createStoryClients(privateKey: PrivateKey) {
  await initWasm();

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({
    chain: aeneid,
    transport: http(RPC_URL),
  });
  const walletClient = createWalletClient({
    account,
    chain: aeneid,
    transport: http(RPC_URL),
  });
  const cdr = new CDRClient({
    network: "testnet",
    publicClient,
    walletClient,
    apiUrl: STORY_API_URL,
  });

  return { account, publicClient, walletClient, cdr };
}
