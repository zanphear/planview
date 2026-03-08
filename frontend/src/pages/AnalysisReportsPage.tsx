import { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { analysisApi, type AnalysisType, type AnalysisReport, type AnalysisReportListItem } from '../api/analysis';
import { useWSEvent } from '../hooks/WebSocketContext';
import { Toast } from '../components/shared/Toast';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useReactToPrint } from 'react-to-print';
import {
  LayoutDashboard, HeartPulse, Shield, Award, CalendarDays, Target,
  UserPlus, GraduationCap, ClipboardCheck, ClipboardList,
  Sparkles, Clock, Trash2, ArrowLeft, FileText, AlertCircle, PlayCircle, Download,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard, HeartPulse, Shield, Award, CalendarDays, Target,
  UserPlus, GraduationCap, ClipboardCheck, ClipboardList,
};

type View = 'types' | 'detail';

export function AnalysisReportsPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [types, setTypes] = useState<AnalysisType[]>([]);
  const [reports, setReports] = useState<AnalysisReportListItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null);
  const [view, setView] = useState<View>('types');
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval>>(null);

  const fetchData = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const [typesRes, reportsRes] = await Promise.all([
        analysisApi.types(workspace.id),
        analysisApi.list(workspace.id),
      ]);
      setTypes(typesRes.data);
      setReports(reportsRes.data);
    } catch {
      Toast.show('Failed to load analysis data');
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // WS listener for real-time status updates
  useWSEvent('report.status_changed', useCallback((data: Record<string, unknown>) => {
    const reportId = data.report_id as string;
    const status = data.status as string;
    const genTime = data.generation_time_seconds as number | undefined;

    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, status, generation_time_seconds: genTime ?? r.generation_time_seconds }
          : r
      )
    );
  }, []));

  // Polling fallback — while any report is queued/generating, poll every 10s
  const hasActive = reports.some((r) => r.status === 'queued' || r.status === 'generating');

  useEffect(() => {
    if (hasActive && workspace) {
      pollRef.current = setInterval(async () => {
        try {
          const { data } = await analysisApi.list(workspace.id);
          setReports(data);
        } catch { /* ignore */ }
      }, 10_000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [hasActive, workspace]);

  const handleGenerate = async (reportType: string) => {
    if (!workspace) return;
    try {
      const { data } = await analysisApi.generate(workspace.id, reportType);
      setReports((prev) => [
        { id: data.id, report_type: data.report_type, title: data.title, status: data.status, generation_time_seconds: null, created_at: data.created_at },
        ...prev,
      ]);
      Toast.show('Report queued');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      Toast.show(detail || 'Failed to queue report');
    }
  };

  const handleGenerateAll = async () => {
    for (const t of types) {
      await handleGenerate(t.key);
    }
  };

  const handleViewReport = async (reportId: string) => {
    if (!workspace) return;
    try {
      const { data } = await analysisApi.get(workspace.id, reportId);
      setSelectedReport(data);
      setView('detail');
    } catch {
      Toast.show('Failed to load report');
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!workspace) return;
    try {
      await analysisApi.delete(workspace.id, reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
        setView('types');
      }
      Toast.show('Report deleted');
    } catch {
      Toast.show('Failed to delete report');
    }
  };

  const handleBack = () => {
    setSelectedReport(null);
    setView('types');
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {view === 'detail' && selectedReport ? (
        <ReportDetailView report={selectedReport} onBack={handleBack} onDelete={handleDelete} />
      ) : (
        <>
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                AI Analysis Reports
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Generate comprehensive AI-powered analysis reports from your people data
              </p>
            </div>
            {types.length > 1 && (
              <button
                onClick={handleGenerateAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors shrink-0"
              >
                <PlayCircle size={16} /> Generate All
              </button>
            )}
          </div>

          {/* Type cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {types.map((t) => {
              const Icon = ICON_MAP[t.icon] || FileText;
              return (
                <div
                  key={t.key}
                  className="rounded-xl border p-5 flex flex-col"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Icon size={20} className="text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {t.label}
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs mb-4 flex-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t.description}
                  </p>
                  <button
                    onClick={() => handleGenerate(t.key)}
                    className="w-full py-2 px-3 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                  >
                    <Sparkles size={14} className="inline mr-1.5 -mt-0.5" />
                    Generate
                  </button>
                </div>
              );
            })}
          </div>

          {/* Previous reports */}
          {reports.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Previous Reports
              </h2>
              <div className="space-y-2">
                {reports.map((r) => {
                  const typeInfo = types.find((t) => t.key === r.report_type);
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      style={{ borderColor: 'var(--color-border)' }}
                      onClick={() => handleViewReport(r.id)}
                    >
                      <FileText size={16} style={{ color: 'var(--color-text-secondary)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {r.title}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {typeInfo?.label || r.report_type}
                          {r.generation_time_seconds != null && ` \u00b7 ${r.generation_time_seconds}s`}
                          {' \u00b7 '}
                          {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                        className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        title="Delete report"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
    status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
    status === 'queued' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
    status === 'generating' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
    'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles}`}>
      {status === 'generating' && <Sparkles size={10} className="inline mr-1 -mt-0.5 animate-pulse" />}
      {status}
    </span>
  );
}

function ReportDetailView({
  report,
  onBack,
  onDelete,
}: {
  report: AnalysisReport;
  onBack: () => void;
  onDelete: (id: string) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: report.title,
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6" data-no-print>
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={18} style={{ color: 'var(--color-text-primary)' }} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {report.title}
          </h1>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <Clock size={12} />
            {new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {report.generation_time_seconds != null && (
              <span> &middot; Generated in {report.generation_time_seconds}s</span>
            )}
          </div>
        </div>
        {report.status === 'completed' && (
          <button
            onClick={() => handlePrint()}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Export to PDF"
          >
            <Download size={16} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        )}
        <button
          onClick={() => onDelete(report.id)}
          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          title="Delete report"
        >
          <Trash2 size={16} className="text-red-500" />
        </button>
      </div>

      {report.status === 'failed' ? (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle size={18} className="text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Report generation failed</p>
            <p className="text-xs mt-1 text-red-600 dark:text-red-300">{report.content}</p>
          </div>
        </div>
      ) : report.status === 'queued' || report.status === 'generating' ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Sparkles size={40} className="text-purple-500 animate-pulse" />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {report.status === 'queued' ? 'Queued for generation...' : 'Generating report...'}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            This page will update automatically when the report is ready.
          </p>
        </div>
      ) : (
        <div ref={contentRef}>
          <div className="print-header hidden mb-6">
            <h1 className="text-2xl font-bold">{report.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Generated {new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
            <hr className="mt-4" />
          </div>
          <div
            className="prose prose-sm dark:prose-invert max-w-none rounded-xl border p-6"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.content || ''}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalysisReportsPage;
