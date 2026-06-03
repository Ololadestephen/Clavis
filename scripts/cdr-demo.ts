import "dotenv/config";
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

const secret = process.env.CLAVIS_SECRET ?? "Clavis demo secret: recover the wallet from the steel backup in box 7.";

const vaultId = process.env.CLAVIS_VAULT_ID
  ? BigInt(process.env.CLAVIS_VAULT_ID)
  : await createClavisVault({ unlockDelaySeconds: 0, heartbeatTimeoutSeconds: 0 });
process.env.CLAVIS_VAULT_ID = vaultId.toString();

const uuid = process.env.CDR_UUID
  ? Number(process.env.CDR_UUID)
  : await uploadSecretToCdr({ cdr: owner.cdr, vaultId, secret });

await tryRead({
  label: "Before recovery: beneficiary should be denied",
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
await tryRead({
  label: "After one approval: beneficiary should still be denied",
  cdr: beneficiary.cdr,
  reader: beneficiary.account.address,
  uuid,
  vaultId,
});

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
  label: "After two approvals: beneficiary should unlock",
  cdr: beneficiary.cdr,
  reader: beneficiary.account.address,
  uuid,
  vaultId,
});
