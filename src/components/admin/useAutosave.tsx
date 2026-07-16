'use client';

// Debounced autosave: call `notify()` on every change; `flush()` on demand.
// Shows a subtle status the form header can render.

import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export function useAutosave(save: () => Promise<boolean>, delayMs = 2500) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  const saveRef = useRef(save);
  saveRef.current = save;

  const run = useCallback(async () => {
    if (saving.current) return;
    saving.current = true;
    setStatus('saving');
    try {
      const ok = await saveRef.current();
      setStatus(ok ? 'saved' : 'error');
    } catch {
      setStatus('error');
    } finally {
      saving.current = false;
    }
  }, []);

  /** Mark dirty and (re)start the debounce clock. */
  const notify = useCallback(() => {
    setStatus('dirty');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(run, delayMs);
  }, [run, delayMs]);

  /** Save now (explicit Save button). */
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    return run();
  }, [run]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { status, notify, flush };
}

export function SaveStatusLabel({ status }: { status: SaveStatus }) {
  const text: Record<SaveStatus, string> = {
    idle: '',
    dirty: 'Unsaved changes…',
    saving: 'Saving…',
    saved: 'All changes saved',
    error: 'Save failed — try again',
  };
  if (!text[status]) return null;
  return (
    <span className={`text-xs ${status === 'error' ? 'text-red-400' : 'text-white/40'}`}>
      {text[status]}
    </span>
  );
}
