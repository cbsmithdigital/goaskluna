const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

interface ElevenLabsRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function elevenLabsFetch<T>(
  path: string,
  options: ElevenLabsRequestOptions = {},
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const response = await fetch(`${ELEVENLABS_BASE_URL}${path}`, {
    method,
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `ElevenLabs API error (${response.status}): ${errorBody}`,
    );
  }

  return response.json() as Promise<T>;
}

// ---- Agents ----

export interface CreateAgentParams {
  name: string;
  conversation_config: {
    agent: {
      prompt: {
        prompt: string;
      };
      first_message?: string;
      language?: string;
    };
    tts?: {
      voice_id?: string;
    };
  };
}

export async function createAgent(params: CreateAgentParams) {
  return elevenLabsFetch<{ agent_id: string }>("/convai/agents/create", {
    method: "POST",
    body: params,
  });
}

export async function updateAgent(agentId: string, params: Partial<CreateAgentParams>) {
  return elevenLabsFetch(`/convai/agents/${agentId}`, {
    method: "PATCH",
    body: params,
  });
}

export async function deleteAgent(agentId: string) {
  return elevenLabsFetch(`/convai/agents/${agentId}`, {
    method: "DELETE",
  });
}

export async function getAgent(agentId: string) {
  return elevenLabsFetch(`/convai/agents/${agentId}`);
}

// ---- Signed URLs ----

export async function getSignedUrl(agentId: string): Promise<string> {
  const data = await elevenLabsFetch<{ signed_url: string }>(
    `/convai/conversation/get-signed-url?agent_id=${agentId}`,
  );
  return data.signed_url;
}

// ---- Conversations ----

export async function getConversation(conversationId: string) {
  return elevenLabsFetch(`/convai/conversations/${conversationId}`);
}

export async function listConversations(agentId: string) {
  return elevenLabsFetch(`/convai/conversations?agent_id=${agentId}`);
}

// ---- Knowledge Bases ----

export interface CreateKBParams {
  name: string;
}

export async function createKnowledgeBase(params: CreateKBParams) {
  return elevenLabsFetch<{ knowledge_base_id: string }>("/convai/knowledge-base", {
    method: "POST",
    body: params,
  });
}

export async function deleteKnowledgeBase(kbId: string) {
  return elevenLabsFetch(`/convai/knowledge-base/${kbId}`, {
    method: "DELETE",
  });
}

export async function getKnowledgeBase(kbId: string) {
  return elevenLabsFetch(`/convai/knowledge-base/${kbId}`);
}

/**
 * Add a document to an ElevenLabs knowledge base.
 * Sends the raw text content as a document for the KB.
 */
export async function addDocumentToKB(
  kbId: string,
  document: { name: string; content: string; mimeType?: string },
) {
  return elevenLabsFetch<{ document_id: string }>(
    `/convai/knowledge-base/${kbId}/document`,
    {
      method: "POST",
      body: {
        name: document.name,
        text: document.content,
      },
    },
  );
}

export async function removeDocumentFromKB(kbId: string, documentId: string) {
  return elevenLabsFetch(
    `/convai/knowledge-base/${kbId}/document/${documentId}`,
    { method: "DELETE" },
  );
}

/**
 * Link a knowledge base to an agent so it can use it for retrieval.
 */
export async function linkKBToAgent(agentId: string, kbId: string) {
  return elevenLabsFetch(`/convai/agents/${agentId}/knowledge-base`, {
    method: "POST",
    body: { knowledge_base_id: kbId },
  });
}

export async function unlinkKBFromAgent(agentId: string, kbId: string) {
  return elevenLabsFetch(`/convai/agents/${agentId}/knowledge-base/${kbId}`, {
    method: "DELETE",
  });
}
