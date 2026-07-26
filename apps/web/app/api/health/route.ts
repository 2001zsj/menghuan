import { getEnvironment } from "@menghuan/config";
import { NextResponse } from "next/server";
import { createWebHealthResponse } from "@/lib/health";

export const dynamic = "force-dynamic";

export function GET() {
  const environment = getEnvironment();
  return NextResponse.json(createWebHealthResponse(environment.APP_ENV));
}
