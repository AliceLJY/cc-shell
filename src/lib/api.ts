import type { SessionInfo, ChatMessage } from "@/types"

const BASE = "/api"

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as Record<string, string>).error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchSessions(): Promise<SessionInfo[]> {
  return jsonFetch(`${BASE}/sessions`)
}

export async function createSession(model: string, prompt: string): Promise<{ sessionId: string; model: string }> {
  return jsonFetch(`${BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt }),
  })
}

export async function sendMessage(sessionId: string, content: string, model?: string): Promise<void> {
  await jsonFetch(`${BASE}/sessions/${sessionId}/msg`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, model }),
  })
}

export async function respondPermission(sessionId: string, requestId: string, allow: boolean): Promise<void> {
  await jsonFetch(`${BASE}/sessions/${sessionId}/permission`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, allow }),
  })
}

export async function fetchMessages(sessionId: string): Promise<ChatMessage[]> {
  return jsonFetch(`${BASE}/sessions/${sessionId}/messages`)
}

export async function stopSession(sessionId: string): Promise<void> {
  await jsonFetch(`${BASE}/sessions/${sessionId}/stop`, { method: "POST" })
}

export async function fetchModels(): Promise<string[]> {
  return jsonFetch(`${BASE}/models`)
}
