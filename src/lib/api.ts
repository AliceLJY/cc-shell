import type { SessionInfo } from "@/types"

const BASE = "/api"

export async function fetchSessions(): Promise<SessionInfo[]> {
  const res = await fetch(`${BASE}/sessions`)
  return res.json()
}

export async function createSession(model: string, prompt?: string): Promise<{ sessionId: string; model: string }> {
  const res = await fetch(`${BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt }),
  })
  return res.json()
}

export async function sendMessage(sessionId: string, content: string): Promise<void> {
  await fetch(`${BASE}/sessions/${sessionId}/msg`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  })
}

export async function respondPermission(sessionId: string, requestId: string, allow: boolean): Promise<void> {
  await fetch(`${BASE}/sessions/${sessionId}/permission`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, allow }),
  })
}

export async function stopSession(sessionId: string): Promise<void> {
  await fetch(`${BASE}/sessions/${sessionId}/stop`, { method: "POST" })
}

export async function fetchModels(): Promise<string[]> {
  const res = await fetch(`${BASE}/models`)
  return res.json()
}
