import { api } from './client';

export interface AIChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AIChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls: Record<string, unknown> | null;
  created_at: string;
}

export interface AIChatSessionDetail extends AIChatSession {
  workspace_id: string;
  user_id: string;
  messages: AIChatMessage[];
}

export interface AIStatus {
  enabled: boolean;
}

export const aiApi = {
  status: (workspaceId: string) =>
    api.get<AIStatus>(`/workspaces/${workspaceId}/ai/status`),

  listSessions: (workspaceId: string) =>
    api.get<AIChatSession[]>(`/workspaces/${workspaceId}/ai/sessions`),

  createSession: (workspaceId: string, title?: string) =>
    api.post<AIChatSessionDetail>(`/workspaces/${workspaceId}/ai/sessions`, { title: title || 'New Chat' }),

  getSession: (workspaceId: string, sessionId: string) =>
    api.get<AIChatSessionDetail>(`/workspaces/${workspaceId}/ai/sessions/${sessionId}`),

  deleteSession: (workspaceId: string, sessionId: string) =>
    api.delete(`/workspaces/${workspaceId}/ai/sessions/${sessionId}`),
};

const API_URL = import.meta.env.VITE_API_URL || '';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function* streamChat(
  workspaceId: string,
  sessionId: string,
  message: string,
): AsyncGenerator<string> {
  const resp = await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/ai/sessions/${sessionId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ message }),
  });

  if (!resp.ok) throw new Error(`Chat failed: ${resp.status}`);
  if (!resp.body) return;

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) yield parsed.content;
        } catch { /* skip malformed */ }
      }
    }
  }
}

export interface QuickReportResult {
  content: string;
  reportId: string | null;
}

export async function runQuickReport(
  workspaceId: string,
  reportType: string,
  onChunk: (text: string) => void,
): Promise<QuickReportResult> {
  const resp = await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/ai/quick-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ report_type: reportType }),
  });

  if (!resp.ok) throw new Error(`Report failed: ${resp.status}`);
  if (!resp.body) return { content: '', reportId: null };

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let collected = '';
  let reportId: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return { content: collected, reportId };
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            collected += parsed.content;
            onChunk(collected);
          }
          if (parsed.report_id) {
            reportId = parsed.report_id;
          }
        } catch { /* skip malformed */ }
      }
    }
  }

  return { content: collected, reportId };
}
