import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getSignedUrl } from "@/lib/elevenlabs/client";
import { handleApiError, UnauthorizedError, NotFoundError, UsageLimitError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();

    const userId = session.user.id;
    const { agentId } = await req.json();
    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
    }

    // Find agent and verify access
    const agent = await db.agent.findUnique({
      where: { id: agentId },
      include: {
        organization: {
          select: {
            id: true,
            usedMinutes: true,
            includedMinutes: true,
            hardCutoff: true,
            stripeSubscriptionId: true,
          },
        },
      },
    });

    if (!agent || !agent.isActive) throw new NotFoundError("Agent");

    // Check if user has access to this org
    if (!agent.isPublic) {
      const membership = await db.orgMembership.findUnique({
        where: { userId_orgId: { userId, orgId: agent.orgId } },
      });
      if (!membership) throw new UnauthorizedError("Not a member of this organization");
    }

    // Check usage limits
    const org = agent.organization;
    if (org.hardCutoff && org.usedMinutes >= org.includedMinutes && org.includedMinutes > 0) {
      throw new UsageLimitError();
    }

    // Get signed URL from ElevenLabs
    if (!agent.elevenLabsAgentId) {
      return NextResponse.json(
        { error: "Agent is not connected to ElevenLabs" },
        { status: 400 },
      );
    }

    const signedUrl = await getSignedUrl(agent.elevenLabsAgentId);

    // Create conversation record
    const conversation = await db.conversation.create({
      data: {
        orgId: agent.orgId,
        agentId: agent.id,
        userId,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      signedUrl,
      conversationId: conversation.id,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
