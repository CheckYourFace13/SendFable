import { promises as fs } from "fs";
import path from "path";
import { randomToken } from "@/lib/utils";

export async function saveUpload(
  file: File,
  workspaceId: string
): Promise<{ url: string }> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const allowed = new Set(["png", "jpg", "jpeg", "gif", "webp"]);
  if (!allowed.has(ext)) throw new Error("Unsupported image type");
  if (bytes.length > 5 * 1024 * 1024) throw new Error("Image must be under 5MB");

  // Optional S3 — if configured, callers can extend; for now local volume
  if (process.env.S3_BUCKET && process.env.S3_PUBLIC_URL) {
    // Minimal local-first path: store locally even when S3 vars exist unless
    // a full S3 client is wired. Keeps the app testable without AWS S3.
    console.warn("[uploads] S3_BUCKET set but local storage used (S3 client not required)");
  }

  const dir = path.join(process.cwd(), "uploads", workspaceId);
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomToken(8)}.${ext}`;
  await fs.writeFile(path.join(dir, name), bytes);
  return { url: `/uploads/${workspaceId}/${name}` };
}
