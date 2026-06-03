export const runtime = "nodejs";

const maxEncryptedUploadBytes = 1.2 * 1024 * 1024;

export async function POST(request: Request) {
  const pinataJwt = process.env.PINATA_JWT;
  const pinataApiKey = process.env.PINATA_API_KEY;
  const pinataSecretKey = process.env.PINATA_SECRET_API_KEY;

  if (!pinataJwt && (!pinataApiKey || !pinataSecretKey)) {
    return Response.json(
      { error: "IPFS pinning is not configured. Add PINATA_JWT or PINATA_API_KEY/PINATA_SECRET_API_KEY." },
      { status: 500 },
    );
  }

  const input = await request.formData();
  const file = input.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing encrypted file." }, { status: 400 });
  }

  if (file.size > maxEncryptedUploadBytes) {
    return Response.json({ error: "Encrypted file is too large for this demo." }, { status: 413 });
  }

  const form = new FormData();
  form.append("file", file, file.name);
  form.append(
    "pinataMetadata",
    JSON.stringify({
      name: file.name,
      keyvalues: {
        app: "clavis",
        encrypted: "true",
      },
    }),
  );

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: pinataJwt
      ? { Authorization: `Bearer ${pinataJwt}` }
      : {
          pinata_api_key: pinataApiKey ?? "",
          pinata_secret_api_key: pinataSecretKey ?? "",
        },
    body: form,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return Response.json(
      { error: body?.error?.details ?? body?.error ?? "IPFS upload failed." },
      { status: response.status },
    );
  }

  return Response.json({
    cid: body.IpfsHash,
    size: body.PinSize,
    gatewayUrl: `${process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://ipfs.io/ipfs"}/${body.IpfsHash}`,
  });
}
