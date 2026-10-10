import { NextResponse } from "next/server";

/** Public form routes only. No credentials, so a customer site can post a signup. */
export function applyPublicFormCors(req: Request, res: NextResponse): NextResponse {
  const origin = req.headers.get("origin");
  res.headers.set("Access-Control-Allow-Origin", origin || "*");
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}

export function publicFormPreflight(req: Request): NextResponse {
  return applyPublicFormCors(req, new NextResponse(null, { status: 204 }));
}
