import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * IndexNow key file. Publish URL as INDEXNOW keyLocation:
 * https://sendfable.com/indexnow/key.txt
 * Body equals INDEXNOW_KEY when set; 404 when unset.
 */
export async function GET() {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    return new NextResponse("IndexNow not configured", { status: 404 });
  }
  return new NextResponse(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
