export type Address = `0x${string}`;

export type CreateVaultInput = {
  owner: Address;
  beneficiary: Address;
  guardians: Address[];
  threshold: number;
  unlockDelaySeconds: number;
  heartbeatTimeoutSeconds: number;
  secret: string;
};

export type CreateVaultResult = {
  vaultId: bigint;
  cdrRef: string;
  transactionHash: string;
};

export type RecoveryStatus = {
  requested: boolean;
  cancelled: boolean;
  requestedAt: bigint;
  approvalCount: number;
  canRead: boolean;
};

export type ContractClient = {
  createVault(input: {
    beneficiary: Address;
    guardians: Address[];
    threshold: number;
    unlockDelaySeconds: number;
    heartbeatTimeoutSeconds: number;
    cdrRef: string;
  }): Promise<{ vaultId: bigint; transactionHash: string }>;
  setCdrRef(vaultId: bigint, cdrRef: string): Promise<{ transactionHash: string }>;
  requestRecovery(vaultId: bigint): Promise<{ transactionHash: string }>;
  approveRecovery(vaultId: bigint): Promise<{ transactionHash: string }>;
  cancelRecovery(vaultId: bigint): Promise<{ transactionHash: string }>;
  heartbeat(vaultId: bigint): Promise<{ transactionHash: string }>;
  canRead(vaultId: bigint, reader: Address): Promise<boolean>;
  getRecovery(vaultId: bigint, reader: Address): Promise<RecoveryStatus>;
};

export type CdrClient = {
  createVault(input: { owner: Address; plaintext: string }): Promise<{ cdrRef: string }>;
  readVault(input: { cdrRef: string; reader: Address }): Promise<{ plaintext: string }>;
};

export async function createClavisVault(
  contract: ContractClient,
  cdr: CdrClient,
  input: CreateVaultInput,
): Promise<CreateVaultResult> {
  const { cdrRef } = await cdr.createVault({
    owner: input.owner,
    plaintext: input.secret,
  });

  const { vaultId, transactionHash } = await contract.createVault({
    beneficiary: input.beneficiary,
    guardians: input.guardians,
    threshold: input.threshold,
    unlockDelaySeconds: input.unlockDelaySeconds,
    heartbeatTimeoutSeconds: input.heartbeatTimeoutSeconds,
    cdrRef,
  });

  return { vaultId, cdrRef, transactionHash };
}

export async function readClavisVault(input: {
  contract: ContractClient;
  cdr: CdrClient;
  vaultId: bigint;
  cdrRef: string;
  reader: Address;
}): Promise<{ allowed: true; plaintext: string } | { allowed: false; reason: string }> {
  const allowed = await input.contract.canRead(input.vaultId, input.reader);

  if (!allowed) {
    return {
      allowed: false,
      reason: "CDR read denied: Clavis canRead returned false.",
    };
  }

  const { plaintext } = await input.cdr.readVault({
    cdrRef: input.cdrRef,
    reader: input.reader,
  });

  return { allowed: true, plaintext };
}
