import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ embedToken: string }> },
) {
  const { embedToken } = await params;

  const deployment = await db.deployment.findUnique({
    where: { embedToken },
    include: {
      agent: {
        select: {
          name: true,
          greetingMessage: true,
          language: true,
          isPublic: true,
        },
      },
    },
  });

  if (!deployment || !deployment.isActive) {
    return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
  }

  // CORS headers for widget embedding
  const origin = req.headers.get("origin");
  const allowedOrigins = deployment.allowedOrigins;
  const isAllowed =
    allowedOrigins.length === 0 || (origin && allowedOrigins.includes(origin));

  const headers: Record<string, string> = {};
  if (isAllowed && origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
  }

  return NextResponse.json(
    {
      agent: deployment.agent,
      config: deployment.widgetConfig,
      requireAuth: deployment.requireAuth,
      type: deployment.type,
    },
    { headers },
  );
}
