import { SignJWT, jwtVerify } from "jose";

export async function createToken(
  payload: Record<string, unknown>,
  secret: string
) {
  const secretKey = new TextEncoder().encode(secret);

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyToken(token: string, secret: string) {
  const secretKey = new TextEncoder().encode(secret);

  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
}