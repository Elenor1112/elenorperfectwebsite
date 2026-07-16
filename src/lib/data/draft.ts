import 'server-only';
import { draftMode } from 'next/headers';

/** Whether draft preview is active. Safe outside a request scope (build-time
 *  sitemap generation, etc.) where it simply reports false. */
export function isDraftMode(): boolean {
  try {
    return draftMode().isEnabled;
  } catch {
    return false;
  }
}
