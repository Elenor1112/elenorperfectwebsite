'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Flag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteConversation,
  setConversationNote,
  toggleConversationFlag,
} from '@/server/actions/ai';
import { Button, Textarea } from '@/components/admin/ui';

/** Admin-only controls for one conversation: internal note, flag, delete. */
export function ConversationTools({
  id,
  initialNote,
  isFlagged,
}: {
  id: string;
  initialNote: string;
  isFlagged: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote);
  const [isPending, startTransition] = useTransition();

  const saveNote = () =>
    startTransition(async () => {
      const result = await setConversationNote(id, note);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  const toggleFlag = () =>
    startTransition(async () => {
      const result = await toggleConversationFlag(id);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  const remove = () => {
    if (!window.confirm('Delete this conversation, its messages and its lead? This cannot be undone.')) {
      return;
    }
    startTransition(async () => {
      const result = await deleteConversation(id);
      if (result.ok) {
        toast.success(result.message);
        router.push('/admin/ai/conversations');
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="internal-note" className="mb-1.5 block text-xs text-white/50">
          Internal note (never shown to the visitor)
        </label>
        <Textarea
          id="internal-note"
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Context for the team…"
        />
        <Button className="mt-3" onClick={saveNote} disabled={isPending}>
          Save note
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
        <Button variant="secondary" onClick={toggleFlag} disabled={isPending}>
          <Flag className="h-4 w-4" />
          {isFlagged ? 'Remove flag' : 'Flag conversation'}
        </Button>
        <Button variant="danger" onClick={remove} disabled={isPending}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
