'use client';

import { useState, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { rebuildKnowledgeIndex } from '@/server/actions/ai';
import { Button } from '@/components/admin/ui';

/**
 * Full rebuild trigger. Runs in a transition so the page stays responsive and
 * the router refreshes the stats once the action resolves.
 */
export function RebuildButton() {
  const [isPending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<string | null>(null);

  const rebuild = () => {
    startTransition(async () => {
      const result = await rebuildKnowledgeIndex(true);
      if (result.ok) {
        toast.success('Knowledge index rebuilt', { description: result.message });
        setLastResult(result.message);
      } else {
        toast.error('Rebuild failed', { description: result.error });
        setLastResult(null);
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      {lastResult ? <span className="text-xs text-white/40">{lastResult}</span> : null}
      <Button onClick={rebuild} disabled={isPending}>
        <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
        {isPending ? 'Rebuilding…' : 'Rebuild knowledge'}
      </Button>
    </div>
  );
}
