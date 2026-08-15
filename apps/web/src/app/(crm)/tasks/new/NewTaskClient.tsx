'use client';

import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { TaskForm, emptyTaskFormValues } from '../TaskForm';

export default function NewTaskClient() {
  const searchParams = useSearchParams();

  // Detail pages link here as /tasks/new?leadId=… or ?dealId=… to prefill the link.
  const initialValues = emptyTaskFormValues({
    relatedLeadId: searchParams.get('leadId') ?? '',
    relatedDealId: searchParams.get('dealId') ?? '',
  });

  return (
    <div className="page-container">
      <PageHeader
        title="Add task"
        subtitle="Schedule follow-up work for your team."
        backHref="/tasks"
        backLabel="Back to tasks"
      />
      <div className="max-w-3xl">
        <TaskForm initialValues={initialValues} />
      </div>
    </div>
  );
}
