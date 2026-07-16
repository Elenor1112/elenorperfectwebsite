import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/rbac';

// Enables draft preview (cookie-based). Accessible to any signed-in admin, or
// via ?secret=PREVIEW_SECRET for sharing a preview link with someone external.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') ?? '/';
  const secret = url.searchParams.get('secret');

  const user = await getCurrentUser();
  const secretOk = Boolean(process.env.PREVIEW_SECRET) && secret === process.env.PREVIEW_SECRET;
  if (!user && !secretOk) {
    return new Response('Unauthorized', { status: 401 });
  }

  draftMode().enable();
  // Only same-site relative paths — never an open redirect.
  redirect(path.startsWith('/') && !path.startsWith('//') ? path : '/');
}
