import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, Plus, Trash2, FileText, Users, Shield, Award, Target, ClipboardList, Loader2, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { aiApi, streamChat, runQuickReport as apiRunQuickReport } from '../api/ai';
import type { AIChatSession, AIChatMessage } from '../api/ai';

const QUICK_REPORTS = [
  { type: 'team_health', label: 'Team Health', icon: Users },
  { type: 'compliance', label: 'Compliance', icon: Shield },
  { type: 'skills_coverage', label: 'Skills Coverage', icon: Award },
  { type: 'objectives_progress', label: 'Objectives', icon: Target },
  { type: 'leave_forecast', label: 'Leave Forecast', icon: FileText },
  { type: 'onboarding_status', label: 'Onboarding', icon: ClipboardList },
];

export function AIAssistantPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [lastReportId, setLastReportId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const enabledModules = workspace?.enabled_modules;
  const isModuleEnabled = enabledModules?.ai_assistant !== false;

  useEffect(() => {
    if (!workspace) return;
    aiApi.status(workspace.id).then(r => setEnabled(r.data.enabled)).catch(() => setEnabled(false));
    aiApi.listSessions(workspace.id).then(r => setSessions(r.data)).catch(() => {});
  }, [workspace]);

  useEffect(() => {
    if (!workspace || !activeSessionId) return;
    aiApi.getSession(workspace.id, activeSessionId)
      .then(r => setMessages(r.data.messages))
      .catch(() => setMessages([]));
  }, [workspace, activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const createSession = useCallback(async () => {
    if (!workspace) return;
    const { data } = await aiApi.createSession(workspace.id);
    setSessions(prev => [data, ...prev]);
    setActiveSessionId(data.id);
    setMessages([]);
  }, [workspace]);

  const deleteSession = useCallback(async (id: string) => {
    if (!workspace) return;
    await aiApi.deleteSession(workspace.id, id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
  }, [workspace, activeSessionId]);

  const sendMessage = useCallback(async () => {
    if (!workspace || !activeSessionId || !input.trim() || streaming) return;
    const msg = input.trim();
    setInput('');
    setStreaming(true);
    setStreamingText('');

    const userMsg: AIChatMessage = {
      id: crypto.randomUUID(),
      session_id: activeSessionId,
      role: 'user',
      content: msg,
      tool_calls: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      let collected = '';
      for await (const chunk of streamChat(workspace.id, activeSessionId, msg)) {
        collected += chunk;
        setStreamingText(collected);
      }
      const assistantMsg: AIChatMessage = {
        id: crypto.randomUUID(),
        session_id: activeSessionId,
        role: 'assistant',
        content: collected,
        tool_calls: null,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errMsg: AIChatMessage = {
        id: crypto.randomUUID(),
        session_id: activeSessionId,
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        tool_calls: null,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setStreaming(false);
      setStreamingText('');
    }
  }, [workspace, activeSessionId, input, streaming]);

  const runQuickReport = useCallback(async (reportType: string) => {
    if (!workspace || streaming) return;
    // Create a new session for the report if none active
    let sid = activeSessionId;
    if (!sid) {
      const { data } = await aiApi.createSession(workspace.id, `Report: ${reportType.replace(/_/g, ' ')}`);
      setSessions(prev => [data, ...prev]);
      setActiveSessionId(data.id);
      sid = data.id;
    }

    setStreaming(true);
    setStreamingText('');
    setLastReportId(null);

    const label = QUICK_REPORTS.find(r => r.type === reportType)?.label || reportType.replace(/_/g, ' ');
    const userMsg: AIChatMessage = {
      id: crypto.randomUUID(),
      session_id: sid,
      role: 'user',
      content: `Generate a ${label} report`,
      tool_calls: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const result = await apiRunQuickReport(workspace.id, reportType, (text) => {
        setStreamingText(text);
      });
      const assistantMsg: AIChatMessage = {
        id: crypto.randomUUID(),
        session_id: sid,
        role: 'assistant',
        content: result.content,
        tool_calls: null,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (result.reportId) {
        setLastReportId(result.reportId);
      }
    } catch {
      const errMsg: AIChatMessage = {
        id: crypto.randomUUID(),
        session_id: sid,
        role: 'assistant',
        content: 'Sorry, failed to generate the report. Please try again.',
        tool_calls: null,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setStreaming(false);
      setStreamingText('');
    }
  }, [workspace, activeSessionId, streaming]);

  if (!user || !isModuleEnabled) return null;

  if (enabled === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left panel — sessions + quick reports */}
      <div className="w-64 shrink-0 border-r flex flex-col" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={createSession}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
          >
            <Plus size={16} /> New Chat
          </button>
        </div>

        {/* Quick Reports */}
        {enabled && (
          <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Quick Reports
            </div>
            <div className="space-y-1">
              {QUICK_REPORTS.map(r => (
                <button
                  key={r.type}
                  onClick={() => runQuickReport(r.type)}
                  disabled={streaming}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <r.icon size={14} /> {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map(s => (
            <div
              key={s.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer group transition-colors ${
                activeSessionId === s.id ? 'bg-[var(--color-primary)]/10 font-medium' : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              style={{ color: 'var(--color-text)' }}
              onClick={() => setActiveSessionId(s.id)}
            >
              <Bot size={14} className="shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
              <span className="truncate flex-1">{s.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-opacity"
              >
                <Trash2 size={12} className="text-red-500" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeSessionId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <Bot size={48} style={{ color: 'var(--color-text-secondary)' }} />
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>AI Assistant</h2>
            <p className="text-sm text-center max-w-md" style={{ color: 'var(--color-text-secondary)' }}>
              {enabled
                ? 'Start a new chat or select a quick report to get AI-powered insights about your team.'
                : 'AI assistant is not configured. Set AI_MODEL_URL in your environment to enable it.'}
            </p>
            {enabled && (
              <button
                onClick={createSession}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
              >
                Start Chat
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'user' ? (
                    <div
                      className="max-w-[75%] rounded-xl rounded-br-sm px-4 py-2.5 text-sm whitespace-pre-wrap"
                      style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
                    >
                      {msg.content}
                    </div>
                  ) : (
                    <div
                      className="max-w-[75%] rounded-xl rounded-bl-sm px-4 py-2.5 text-sm border prose prose-sm dark:prose-invert max-w-none"
                      style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
              {streaming && streamingText && (
                <div className="flex justify-start">
                  <div
                    className="max-w-[75%] rounded-xl rounded-bl-sm px-4 py-2.5 text-sm border prose prose-sm dark:prose-invert max-w-none"
                    style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                    <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ backgroundColor: 'var(--color-primary)' }} />
                  </div>
                </div>
              )}
              {streaming && !streamingText && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Report link banner */}
            {lastReportId && (
              <div className="border-t px-4 py-2 flex items-center gap-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                <FileText size={14} className="text-purple-500" />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Report saved.</span>
                <button
                  onClick={() => navigate('/analysis')}
                  className="text-sm font-medium flex items-center gap-1 hover:underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  View in Analysis Reports <ExternalLink size={12} />
                </button>
              </div>
            )}

            {/* Input */}
            <div className="border-t p-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-end gap-2 max-w-3xl mx-auto">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={enabled ? "Type a message..." : "AI not configured"}
                  disabled={!enabled || streaming}
                  rows={1}
                  className="flex-1 resize-none rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    '--tw-ring-color': 'var(--color-primary)',
                  } as React.CSSProperties}
                />
                <button
                  onClick={sendMessage}
                  disabled={!enabled || !input.trim() || streaming}
                  className="p-2.5 rounded-xl transition-colors disabled:opacity-30"
                  style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
