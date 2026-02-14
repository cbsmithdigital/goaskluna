import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { withOrgPermission } from "@/lib/auth/guards";
import { createDeploymentSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";

export const GET = withOrgPermission("deployment:manage", async (req, { orgId }) => {
  const deployments = await db.deployment.findMany({
    where: { orgId },
    include: {
      agent: { select: { name: true } },
      _count: { select: { conversations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(deployments);
});

export const POST = withOrgPermission("deployment:manage", async (req, { orgId, userId }) => {
  const body = await req.json();
  const data = createDeploymentSchema.parse(body);

  // Verify agent belongs to this org
  const agent = await db.agent.findFirst({
    where: { id: data.agentId, orgId },
  });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const { widgetConfig, ...rest } = data;
  const deployment = await db.deployment.create({
    data: {
      ...rest,
      widgetConfig: widgetConfig as Prisma.InputJsonValue,
      orgId,
    },
  });

  await createAuditLog({
    orgId,
    userId,
    action: "deployment.create",
    entityType: "Deployment",
    entityId: deployment.id,
    metadata: { name: deployment.name, type: deployment.type },
  });

  return NextResponse.json(deployment, { status: 201 });
});
