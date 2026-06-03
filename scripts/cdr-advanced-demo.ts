import "dotenv/config";
import { clavisAbi } from "./clavisAbi.js";
import {
  beneficiary,
  clavis,
  createClavisVault,
  guardianOne,
  guardianTwo,
  owner,
  sleep,
  tryRead,
  uploadSecretToCdr,
  writeAndWait,
} from "./clavisDemoShared.js";

const heartbeatTimeoutSeconds = Number(process.env.ADVANCED_HEARTBEAT_TIMEOUT_SECONDS ?? "45");
const unlockDelaySeconds = Number(process.env.ADVANCED_UNLOCK_DELAY_SECONDS ?? "30");
const secret =
  process.env.CLAVIS_ADVANCED_SECRET ??
  "Clavis advanced demo secret: release only after proof-of-life expiry, 2 guardians, and final delay.";

console.log("Advanced recovery settings:");
console.log("heartbeatTimeoutSeconds:", heartbeatTimeoutSeconds);
console.log("unlockDelaySeconds:", unlockDelaySeconds);

const vaultId = await createClavisVault({
  unlockDelaySeconds,
  heartbeatTimeoutSeconds,
});
const uuid = await uploadSecretToCdr({ cdr: owner.cdr, vaultId, secret });

await tryRead({
  label: "Immediately after creation: beneficiary should be denied",
  cdr: beneficiary.cdr,
  reader: beneficiary.account.address,
  uuid,
  vaultId,
});

await writeAndWait(
  await owner.walletClient.writeContract({
    address: clavis,
    abi: clavisAbi,
    functionName: "heartbeat",
    args: [vaultId],
  }),
  "Owner heartbeat tx",
);

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
  label: "After one guardian: still denied",
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
  label: "After 2-of-3 guardians, before final delay/inactivity: still denied",
  cdr: beneficiary.cdr,
  reader: beneficiary.account.address,
  uuid,
  vaultId,
});

const waitSeconds = Math.max(heartbeatTimeoutSeconds, unlockDelaySeconds) + 8;
console.log(`\nWaiting ${waitSeconds}s for heartbeat timeout and final unlock delay...`);
await sleep(waitSeconds * 1000);

await tryRead({
  label: "After proof-of-life timeout and final delay: beneficiary should unlock",
  cdr: beneficiary.cdr,
  reader: beneficiary.account.address,
  uuid,
  vaultId,
});
