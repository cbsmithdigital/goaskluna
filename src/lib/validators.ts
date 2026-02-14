import { z } from "zod";

// ---- Organization ----
export const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
});

export const updateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().optional().nullable(),
  settings: z.record(z.string(), z.unknown()).optional(),
  billingEmail: z.string().email().optional(),
});

// ---- Knowledge Base ----
export const createKBSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(["INTERNAL", "PUBLIC"]).default("INTERNAL"),
  visibility: z.enum(["ALL_EMPLOYEES", "MANAGERS_ONLY", "HR_ONLY", "PUBLIC"]).default("ALL_EMPLOYEES"),
});

export const updateKBSchema = createKBSchema.partial();

// ---- Document ----
export const uploadDocSchema = z.object({
  title: z.string().min(1).max(500),
  fileName: z.string().min(1),
  mimeType: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/html",
    "text/plain",
    "text/markdown",
  ]),
  fileSizeBytes: z.number().positive().max(50 * 1024 * 1024), // 50MB max
  visibilityOverride: z.enum(["ALL_EMPLOYEES", "MANAGERS_ONLY", "HR_ONLY", "PUBLIC"]).optional(),
});

export const uploadFromUrlSchema = z.object({
  title: z.string().min(1).max(500),
  url: z.string().url(),
  visibilityOverride: z.enum(["ALL_EMPLOYEES", "MANAGERS_ONLY", "HR_ONLY", "PUBLIC"]).optional(),
});

// ---- Agent ----
export const createAgentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  voiceId: z.string().optional(),
  modelId: z.string().optional(),
  systemPrompt: z.string().max(10000).optional(),
  greetingMessage: z.string().max(500).optional(),
  enablePiiGuardrails: z.boolean().default(true),
  enableEscalation: z.boolean().default(true),
  escalationMessage: z.string().max(500).optional(),
  maxSessionMinutes: z.number().int().min(1).max(60).default(15),
  language: z.string().default("en"),
  isPublic: z.boolean().default(false),
  knowledgeBaseIds: z.array(z.string()).optional(),
});

export const updateAgentSchema = createAgentSchema.partial();

// ---- Deployment ----
export const createDeploymentSchema = z.object({
  name: z.string().min(1).max(200),
  agentId: z.string(),
  type: z.enum(["WEB_WIDGET", "STANDALONE", "PWA", "API"]).default("WEB_WIDGET"),
  widgetConfig: z.record(z.string(), z.unknown()).default({}),
  allowedOrigins: z.array(z.string().url()).default([]),
  requireAuth: z.boolean().default(true),
});

export const updateDeploymentSchema = createDeploymentSchema.partial().omit({ agentId: true });

// ---- Members ----
export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ORG_ADMIN", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
});

export const updateMemberSchema = z.object({
  role: z.enum(["ORG_ADMIN", "MANAGER", "EMPLOYEE"]),
});

// ---- Tickets ----
export const createTicketSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(5000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  conversationId: z.string().optional(),
});

export const updateTicketSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedToId: z.string().optional().nullable(),
});

// ---- Analytics query params ----
export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  agentId: z.string().optional(),
  deploymentId: z.string().optional(),
});

// ---- Conversation ----
export const rateConversationSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(1000).optional(),
});
