import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createStoryClients, getRequiredPrivateKey } from "./cdrClient.js";
import { txFees } from "./fees.js";

const artifact = JSON.parse(await readFile("out/ClavisVault.sol/ClavisVault.json", "utf8"));
const bytecode = artifact.bytecode.object as `0x${string}`;
const abi = artifact.abi;

const { publicClient, walletClient, account } = await createStoryClients(getRequiredPrivateKey("OWNER_PRIVATE_KEY"));

console.log("Deploying ClavisVault from", account.address);
const hash = await walletClient.deployContract({
  abi,
  bytecode,
  gas: 5_000_000n,
  ...txFees,
});
console.log("Deploy tx:", hash);

const receipt = await publicClient.waitForTransactionReceipt({ hash });
if (receipt.status !== "success" || !receipt.contractAddress) {
  throw new Error(`Deploy failed: status=${receipt.status}, gasUsed=${receipt.gasUsed}`);
}
console.log("Clavis contract:", receipt.contractAddress);
