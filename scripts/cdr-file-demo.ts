import "dotenv/config";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { clavisAbi } from "./clavisAbi.js";
import {
  beneficiary,
  clavis,
  createClavisVault,
  guardianOne,
  guardianTwo,
  owner,
  tryRead,
  uploadSecretToCdr,
  writeAndWait,
} from "./clavisDemoShared.js";

const filePath = process.env.CLAVIS_FILE_PATH;
if (!filePath) {
  throw new Error("Missing CLAVIS_FILE_PATH. Set it to the file you want to seal in CDR.");
}

const fileStats = await stat(filePath);
if (fileStats.size > 2 * 1024 * 1024) {
  throw new Error("CLAVIS_FILE_PATH must be smaller than 2 MB for the hackathon demo.");
}

const vaultId = await createClavisVault({ unlockDelaySeconds: 0, heartbeatTimeoutSeconds: 0 });
const fileBytes = await readFile(filePath);
const uuid = await uploadSecretToCdr({
  cdr: owner.cdr,
  vaultId,
  bytes: fileBytes,
  fileName: basename(filePath),
  mimeType: process.env.CLAVIS_FILE_MIME_TYPE ?? "application/octet-stream",
});

await tryRead({
  label: "Before recovery: file should be denied",
  cdr: beneficiary.cdr,
  reader: beneficiary.account.address,
  uuid,
  vaultId,
});

await writeAndWait(
  await beneficiary.walletClient.writeContract({
    address: clavis,
    abi: clavisAbi,
    functionName: "requestRecovery",
    args: [vaultId],
  }),
  "Request recovery tx",
);

await writeAndWait(
  await guardianOne.walletClient.writeContract({
    address: clavis,
    abi: clavisAbi,
    functionName: "approveRecovery",
    args: [vaultId],
  }),
  "Guardian 1 approve tx",
);

await writeAndWait(
  await guardianTwo.walletClient.writeContract({
    address: clavis,
    abi: clavisAbi,
    functionName: "approveRecovery",
    args: [vaultId],
  }),
  "Guardian 2 approve tx",
);

await tryRead({
  label: "After recovery: file should unlock",
  cdr: beneficiary.cdr,
  reader: beneficiary.account.address,
  uuid,
  vaultId,
});
