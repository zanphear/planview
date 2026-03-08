import { api } from './client';

export interface AnalysisType {
  key: string;
  label: string;
  description: string;
  icon: string;
}

export interface AnalysisReport {
  id: string;
  workspace_id: string;
  user_id: string;
  report_type: string;
  title: string;
  content: string | null;
  parameters: Record<string, unknown> | null;
  status: string;
  generation_time_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisReportListItem {
  id: string;
  report_type: string;
  title: string;
  status: string;
  generation_time_seconds: number | null;
  created_at: string;
}

export const analysisApi = {
  types: (workspaceId: string) =>
    api.get<AnalysisType[]>(`/workspaces/${workspaceId}/analysis/types`),

  generate: (workspaceId: string, reportType: string) =>
    api.post<AnalysisReport>(`/workspaces/${workspaceId}/analysis/generate`, { report_type: reportType }),

  list: (workspaceId: string) =>
    api.get<AnalysisReportListItem[]>(`/workspaces/${workspaceId}/analysis/reports`),

  get: (workspaceId: string, reportId: string) =>
    api.get<AnalysisReport>(`/workspaces/${workspaceId}/analysis/reports/${reportId}`),

  delete: (workspaceId: string, reportId: string) =>
    api.delete(`/workspaces/${workspaceId}/analysis/reports/${reportId}`),
};
