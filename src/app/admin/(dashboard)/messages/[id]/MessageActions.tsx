'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteMessage, saveMessageNote, setMessageStatus } from '@/server/actions/messages';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button, Card, Field, Select, Textarea } from '@/components/admin/ui';

export function MessageActions({
  id,
  status: initialStatus,
  note: initialNote,
  email,
  name,
}: {
  id: string;
  status: string;
  note: string;
  email: string;
  name: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState(initialNote);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="mt-6 space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Status" className="min-w-[160px]">
          <Select
            value={status}
            onChange={(e) => {
              const next = e.target.value;
              setStatus(next);
              startTransition(async () => {
                await setMessageStatus(id, next as never);
                toast.success('Status updated');
              });
            }}
          >
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
        <a href={`mailto:${email}?subject=${encodeURIComponent(`Re: your message to Elenor`)}`}>
          <Button
            variant="secondary"
            onClick={() => {
              setStatus('replied');
              startTransition(async () => {
                await setMessageStatus(id, 'replied');
              });
            }}
          >
            Reply by email
          </Button>
        </a>
        <ConfirmDialog
          title={`Delete message from ${name}?`}
          description="This permanently removes the message."
          onConfirm={() =>
            startTransition(async () => {
              await deleteMessage(id);
              toast.success('Message deleted');
              router.replace('/admin/messages');
            })
          }
        >
          <Button variant="danger">Delete</Button>
        </ConfirmDialog>
      </div>

      <Field label="Internal notes" hint="only visible to the team">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Called on Tuesday — waiting on budget confirmation…" />
      </Field>
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await saveMessageNote(id, note);
              toast.success('Note saved');
            })
          }
        >
          Save note
        </Button>
      </div>
    </Card>
  );
}
