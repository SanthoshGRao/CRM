'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, Loader2, Upload, X, XCircle } from 'lucide-react';
import { importApi, ImportResource, ImportResult } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { ErrorBanner } from '@/components/ui/Field';
import { PipelineStageSelect } from '@/components/ui/PipelineStageSelect';

interface ImportDialogProps {
  resource: ImportResource;
  /** Plural, lowercase — "contacts" / "companies" / "leads" — used in copy. */
  label: string;
  onClose: () => void;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Shared bulk-upload modal for Contacts, Companies, and Leads. Leads alone
 * need a pipeline + default stage picked up front, since a lead can't be
 * created without one.
 */
export function ImportDialog({ resource, label, onClose }: ImportDialogProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [pipelineId, setPipelineId] = useState('');
  const [stageId, setStageId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const runImport = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose a file first.');
      const contentBase64 = await readFileAsBase64(file);
      return importApi.run(resource, {
        originalFilename: file.name,
        contentBase64,
        ...(resource === 'leads' ? { pipelineId, stageId } : {}),
      });
    },
    onSuccess: (data) => {
      setError(null);
      setResult(data);
      queryClient.invalidateQueries({ queryKey: [resource] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const downloadTemplate = useMutation({
    mutationFn: () => importApi.template(resource),
    onError: (err) => setError(getErrorMessage(err)),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    runImport.mutate();
  }

  const needsPipeline = resource === 'leads';
  const canSubmit = Boolean(file) && (!needsPipeline || Boolean(pipelineId && stageId));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id="import-dialog-title" className="text-base font-semibold text-slate-900">
              Import {label}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Upload an Excel or CSV file to create many {label} at once.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-surface-2 hover:text-slate-600"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
          <ErrorBanner message={error} />

          <button
            type="button"
            className="btn-secondary btn-sm self-start"
            onClick={() => downloadTemplate.mutate()}
            disabled={downloadTemplate.isPending}
          >
            {downloadTemplate.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Download className="h-3.5 w-3.5" />}
            Download template
          </button>

          {needsPipeline && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <PipelineStageSelect
                  entityType="lead"
                  pipelineId={pipelineId}
                  stageId={stageId}
                  onChange={(next) => { setPipelineId(next.pipelineId); setStageId(next.stageId); }}
                />
              </div>
              <p className="-mt-2 text-xs text-slate-400">
                Rows land in the stage above unless their "Stage" column names a different one in this pipeline.
              </p>
            </>
          )}

          <div className="form-group">
            <label className="label" htmlFor="import-file-input">File</label>
            <input
              id="import-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="input"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }}
            />
          </div>

          {result && (
            <div className="rounded-lg border border-slate-200 bg-surface-1 p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Created {result.created} of {result.totalRows} rows
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-600">
                  {result.errors.map((e, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-500" />
                      <span>Row {e.row}: {e.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t pt-4">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={runImport.isPending}>
              {result ? 'Close' : 'Cancel'}
            </button>
            <button type="submit" className="btn-primary" disabled={!canSubmit || runImport.isPending}>
              {runImport.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Upload className="h-4 w-4" />}
              Import
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
