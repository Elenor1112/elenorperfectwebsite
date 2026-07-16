'use client';

import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Button } from './ui';

/** Wrap any trigger element; asks for confirmation before running onConfirm. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{children}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0e0f16] p-6 text-white shadow-2xl">
          <AlertDialog.Title className="font-display text-lg font-semibold">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-white/60">
            {description}
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant="danger" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
