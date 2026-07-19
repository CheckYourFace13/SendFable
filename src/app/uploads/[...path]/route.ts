import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

export async function GET(
  _req: Request,
  { params }: { params: { path: string[] } }
) {
  const parts = params.path;
  if (!parts?.length || parts.some((p) => p.includes("..") || p.includes("\\"))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "uploads", ...parts);
  try {
    const data = await fs.readFile(filePath);
    const ext = (parts[parts.length - 1].split(".").pop() || "").toLowerCase();
    return new NextResponse(data, {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
