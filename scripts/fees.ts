import { parseGwei } from "viem";

export const txFees = {
  maxFeePerGas: parseGwei(process.env.MAX_FEE_GWEI ?? "2"),
  maxPriorityFeePerGas: parseGwei(process.env.MAX_PRIORITY_FEE_GWEI ?? "1"),
};
