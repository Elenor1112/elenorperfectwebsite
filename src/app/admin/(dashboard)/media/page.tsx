import type { Metadata } from 'next';
import { MediaLibrary } from '@/components/admin/media/MediaLibrary';

export const metadata: Metadata = { title: 'Media' };
export const dynamic = 'force-dynamic';

export default function MediaPage() {
  return <MediaLibrary />;
}
