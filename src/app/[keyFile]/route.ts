import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * IndexNow root key file: https://{host}/{INDEXNOW_KEY}.txt
 * Only serves when the path equals the configured key + ".txt".
 */
export async function GET(
  _req: Request,
  { params }: { params: { keyFile: string } }
) {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (params.keyFile !== `${key}.txt`) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
