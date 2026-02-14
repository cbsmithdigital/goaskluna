import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withOrgPermission } from "@/lib/auth/guards";
import { createTicketSchema } from "@/lib/validators";

export const GET = withOrgPermission("tickets:manage", async (req, { orgId }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const where: Record<string, unknown> = { orgId };
  if (status) where.status = status;

  const tickets = await db.ticket.findMany({
    where,
    include: {
      createdBy: { select: { name: true, email: true } },
      assignedTo: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(tickets);
});

export const POST = withOrgPermission("tickets:manage", async (req, { orgId, userId }) => {
  const body = await req.json();
  const data = createTicketSchema.parse(body);

  const ticket = await db.ticket.create({
    data: {
      orgId,
      createdById: userId,
      ...data,
    },
  });

  return NextResponse.json(ticket, { status: 201 });
});
