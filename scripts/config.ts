import { defineChain } from "viem";

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
      http: [process.env.RPC_URL ?? "https://aeneid.storyrpc.io"],
    },
  },
});

export const RPC_URL = process.env.RPC_URL ?? "https://aeneid.storyrpc.io";
export const STORY_API_URL = process.env.STORY_API_URL ?? "http://172.192.41.96:1317";
