import { SignJWT, jwtVerify } from "jose";

export type TokenPurpose =
  | "email-verify"
  | "sender-verify"
  | "unsubscribe"
  | "form-confirm"
  | "invite";

function secret(): Uint8Array {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function signToken(
  purpose: TokenPurpose,
  payload: Record<string, string>,
  expiresIn: string = "7d"
): Promise<string> {
  return new SignJWT({ ...payload, purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifyToken(
  purpose: TokenPurpose,
  token: string
): Promise<Record<string, string> | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== purpose) return null;
    const { purpose: _p, iat, exp, ...rest } = payload;
    return rest as Record<string, string>;
  } catch {
    return null;
  }
}
