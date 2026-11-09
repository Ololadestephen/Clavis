import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { botChain, RPC_URL, EXPLORER_URL } from "./config.js";

async function main() {
  const privateKey =
    process.env.DEPLOYER_PRIVATE_KEY ||
    process.env.BOTCHAIN_PRIVATE_KEY ||
    process.env.OWNER_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      "Missing deployer private key in environment. Set DEPLOYER_PRIVATE_KEY or BOTCHAIN_PRIVATE_KEY."
    );
  }

  const formattedKey = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`;
  const account = privateKeyToAccount(formattedKey);

  const publicClient = createPublicClient({
    chain: botChain,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: botChain,
    transport: http(RPC_URL),
  });

  console.log("--------------------------------------------------");
  console.log(`Deploying ClavisVault to ${botChain.name} (Chain ID: ${botChain.id})`);
  console.log(`Deployer Address: ${account.address}`);
  console.log(`RPC Endpoint: ${RPC_URL}`);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer Balance: ${(Number(balance) / 1e18).toFixed(4)} BOT`);

  const artifactRaw = await readFile("out/ClavisVault.sol/ClavisVault.json", "utf8");
  const artifact = JSON.parse(artifactRaw);
  const bytecode = artifact.bytecode.object as `0x${string}`;
  const abi = artifact.abi;

  console.log("Submitting deployment transaction...");
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
  });
  console.log(`Transaction Hash: ${hash}`);
  console.log(`Explorer Link: ${EXPLORER_URL}/tx/${hash}`);

  console.log("Waiting for block confirmation...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== "success" || !receipt.contractAddress) {
    throw new Error(`Deployment failed on-chain with status: ${receipt.status}`);
  }

  console.log("==================================================");
  console.log("ClavisVault Successfully Deployed!");
  console.log(`Contract Address: ${receipt.contractAddress}`);
  console.log(`Block Number: ${receipt.blockNumber}`);
  console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`Contract on Explorer: ${EXPLORER_URL}/address/${receipt.contractAddress}`);
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Deploy script error:", err.message);
  process.exit(1);
});
