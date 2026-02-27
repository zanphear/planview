import { useEffect, useState } from 'react';
import { Sliders } from 'lucide-react';
import { customFieldsApi, type CustomField, type CustomFieldValue } from '../../api/customFields';
import { useWorkspaceStore } from '../../stores/workspaceStore';

interface CustomFieldsEditorProps {
  taskId: string;
}

export function CustomFieldsEditor({ taskId }: CustomFieldsEditorProps) {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [values, setValues] = useState<CustomFieldValue[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!workspace) return;
    Promise.all([
      customFieldsApi.list(workspace.id),
      customFieldsApi.getValues(workspace.id, taskId),
    ]).then(([fieldsRes, valuesRes]) => {
      setFields(fieldsRes.data);
      setValues(valuesRes.data);
      setLoaded(true);
    });
  }, [workspace, taskId]);

  if (!loaded || fields.length === 0) return null;

  const getValue = (fieldId: string) =>
    values.find((v) => v.field_id === fieldId)?.value || '';

  const saveValue = async (fieldId: string, value: string) => {
    if (!workspace) return;
    const { data } = await customFieldsApi.setValues(workspace.id, taskId, [
      { field_id: fieldId, value: value || null },
    ]);
    setValues(data);
  };

  return (
    <div>
      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
        <Sliders size={12} className="inline mr-1" />
        Custom Fields
      </label>
      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.id}>
            <label className="block text-[11px] mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {field.name}
            </label>
            {field.field_type === 'checkbox' ? (
              <input
                type="checkbox"
                checked={getValue(field.id) === 'true'}
                onChange={(e) => saveValue(field.id, e.target.checked ? 'true' : 'false')}
                className="rounded"
              />
            ) : field.field_type === 'select' && field.options ? (
              <select
                value={getValue(field.id)}
                onChange={(e) => saveValue(field.id, e.target.value)}
                className="w-full px-2 py-1 text-sm border rounded-lg"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                <option value="">—</option>
                {JSON.parse(field.options).map((opt: string) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.field_type === 'number' ? (
              <input
                type="number"
                value={getValue(field.id)}
                onChange={(e) => saveValue(field.id, e.target.value)}
                className="w-full px-2 py-1 text-sm border rounded-lg"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              />
            ) : field.field_type === 'date' ? (
              <input
                type="date"
                value={getValue(field.id)}
                onChange={(e) => saveValue(field.id, e.target.value)}
                className="w-full px-2 py-1 text-sm border rounded-lg"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              />
            ) : (
              <input
                type="text"
                value={getValue(field.id)}
                onBlur={(e) => saveValue(field.id, e.target.value)}
                onChange={(e) => {
                  const val = e.target.value;
                  setValues((prev) => {
                    const existing = prev.find((v) => v.field_id === field.id);
                    if (existing) {
                      return prev.map((v) => v.field_id === field.id ? { ...v, value: val } : v);
                    }
                    return [...prev, { id: '', field_id: field.id, task_id: taskId, value: val, created_at: '' }];
                  });
                }}
                className="w-full px-2 py-1 text-sm border rounded-lg"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
