import { api } from './client';

export interface OnboardingTemplateItem {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  default_assignee_role: string | null;
}

export interface OnboardingTemplate {
  id: string;
  workspace_id: string;
  name: string;
  template_type: string;
  description: string | null;
  items: OnboardingTemplateItem[];
  created_at: string;
}

export interface OnboardingChecklistItem {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  completed: boolean;
  assigned_to: string | null;
}

export interface OnboardingChecklist {
  id: string;
  workspace_id: string;
  user_id: string;
  checklist_type: string;
  status: string;
  checklist_items: OnboardingChecklistItem[];
  created_at: string;
}

export const onboardingApi = {
  // Templates
  listTemplates: (workspaceId: string) =>
    api.get<OnboardingTemplate[]>(`/workspaces/${workspaceId}/onboarding/templates`),

  createTemplate: (
    workspaceId: string,
    data: {
      name: string;
      template_type: string;
      description?: string;
      items: Partial<OnboardingTemplateItem>[];
    },
  ) => api.post<OnboardingTemplate>(`/workspaces/${workspaceId}/onboarding/templates`, data),

  deleteTemplate: (workspaceId: string, templateId: string) =>
    api.delete(`/workspaces/${workspaceId}/onboarding/templates/${templateId}`),

  // Checklists
  listChecklists: (workspaceId: string) =>
    api.get<OnboardingChecklist[]>(`/workspaces/${workspaceId}/onboarding/checklists`),

  createChecklist: (
    workspaceId: string,
    data: { user_id: string; template_id?: string; checklist_type?: string },
  ) => api.post<OnboardingChecklist>(`/workspaces/${workspaceId}/onboarding/checklists`, data),

  toggleItem: (workspaceId: string, checklistId: string, itemId: string) =>
    api.put<OnboardingChecklist>(
      `/workspaces/${workspaceId}/onboarding/checklists/${checklistId}/items/${itemId}`,
    ),
};
