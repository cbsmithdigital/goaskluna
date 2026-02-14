import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSignedUrl } from "@/lib/elevenlabs/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ embedToken: string }> },
) {
  try {
    const { embedToken } = await params;

    // Look up the deployment by embedToken
    const deployment = await db.deployment.findUnique({
      where: { embedToken },
      include: {
        agent: {
          select: {
            id: true,
            orgId: true,
            elevenLabsAgentId: true,
            isActive: true,
          },
        },
        organization: {
          select: {
            id: true,
            usedMinutes: true,
            includedMinutes: true,
            hardCutoff: true,
          },
        },
      },
    });

    if (!deployment || !deployment.isActive) {
      return NextResponse.json(
        { error: "Deployment not found" },
        { status: 404 },
      );
    }

    if (!deployment.agent.isActive) {
      return NextResponse.json(
        { error: "Agent is not available" },
        { status: 404 },
      );
    }

    // Check CORS (allowedOrigins)
    const origin = req.headers.get("origin");
    const allowedOrigins = deployment.allowedOrigins;
    const isAllowed =
      allowedOrigins.length === 0 || (origin && allowedOrigins.includes(origin));

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Origin not allowed" },
        { status: 403 },
      );
    }

    // Check usage limits
    const org = deployment.organization;
    if (
      org.hardCutoff &&
      org.usedMinutes >= org.includedMinutes &&
      org.includedMinutes > 0
    ) {
      return NextResponse.json(
        { error: "Usage limit exceeded" },
        { status: 402 },
      );
    }

    // Get the agent's elevenLabsAgentId
    const { elevenLabsAgentId } = deployment.agent;
    if (!elevenLabsAgentId) {
      return NextResponse.json(
        { error: "Agent is not connected to ElevenLabs" },
        { status: 400 },
      );
    }

    // Get signed URL from ElevenLabs
    const signedUrl = await getSignedUrl(elevenLabsAgentId);

    // Create a conversation record (no userId since public widget)
    const conversation = await db.conversation.create({
      data: {
        orgId: deployment.agent.orgId,
        agentId: deployment.agent.id,
        deploymentId: deployment.id,
        status: "ACTIVE",
      },
    });

    // Build CORS headers
    const headers: Record<string, string> = {};
    if (origin && isAllowed) {
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
      headers["Access-Control-Allow-Headers"] = "Content-Type";
    }

    return NextResponse.json(
      { signedUrl, conversationId: conversation.id },
      { headers },
    );
  } catch (error) {
    console.error("[Widget Signed URL Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function OPTIONS(
  req: Request,
  { params }: { params: Promise<{ embedToken: string }> },
) {
  const { embedToken } = await params;

  const deployment = await db.deployment.findUnique({
    where: { embedToken },
    select: { allowedOrigins: true, isActive: true },
  });

  if (!deployment || !deployment.isActive) {
    return new NextResponse(null, { status: 404 });
  }

  const origin = req.headers.get("origin");
  const allowedOrigins = deployment.allowedOrigins;
  const isAllowed =
    allowedOrigins.length === 0 || (origin && allowedOrigins.includes(origin));

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };

  if (isAllowed && origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return new NextResponse(null, { status: 204, headers });
}
