'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { login, type LoginState } from '@/server/actions/auth';

const initialState: LoginState = { ok: true, message: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white transition hover:bg-brand-glow disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useFormState(login, initialState);

  return (
    <form action={action}>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <label className="block text-sm font-medium text-white/70" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none transition focus:border-brand"
      />
      <label className="mt-4 block text-sm font-medium text-white/70" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none transition focus:border-brand"
      />
      {!state.ok && state.message ? (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
