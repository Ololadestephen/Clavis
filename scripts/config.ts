import { defineChain } from "viem";

export const botChain = defineChain({
  id: Number(process.env.BOTCHAIN_CHAIN_ID ?? process.env.CHAIN_ID ?? "677"),
  name: process.env.BOTCHAIN_NETWORK_NAME ?? "BOT Chain",
  nativeCurrency: {
    decimals: 18,
    name: "BOT",
    symbol: "BOT",
  },
  rpcUrls: {
    default: {
      http: [process.env.BOTCHAIN_RPC_URL ?? process.env.RPC_URL ?? "https://rpc.botchain.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "BOT Scan",
      url: process.env.BOTCHAIN_EXPLORER_URL ?? "https://scan.botchain.ai",
    },
  },
});

export const RPC_URL = process.env.BOTCHAIN_RPC_URL ?? process.env.RPC_URL ?? "https://rpc.botchain.ai";
export const EXPLORER_URL = process.env.BOTCHAIN_EXPLORER_URL ?? "https://scan.botchain.ai";

// Historical Story Aeneid definition preserved for reference
export const aeneid = defineChain({
  id: 1315,
  name: "Story Aeneid",
  nativeCurrency: {
    decimals: 18,
    name: "IP",
    symbol: "IP",
  },
  rpcUrls: {
    default: {
      http: ["https://aeneid.storyrpc.io"],
    },
  },
});
export const STORY_API_URL = process.env.STORY_API_URL ?? "http://172.192.41.96:1317";
