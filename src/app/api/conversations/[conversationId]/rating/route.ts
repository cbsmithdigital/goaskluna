import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { handleApiError, UnauthorizedError, NotFoundError } from "@/lib/errors";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();

    const userId = session.user.id;
    const { conversationId } = await params;
    const { rating, feedback } = await req.json();

    // Validate rating
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be a number between 1 and 5" },
        { status: 400 },
      );
    }

    // Validate optional feedback
    if (feedback !== undefined && typeof feedback !== "string") {
      return NextResponse.json(
        { error: "Feedback must be a string" },
        { status: 400 },
      );
    }

    // Find the conversation and verify it belongs to the user
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new NotFoundError("Conversation");

    if (conversation.userId !== userId) {
      throw new UnauthorizedError("You do not have access to this conversation");
    }

    // Update the conversation with rating and feedback
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        rating,
        feedback: feedback ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
