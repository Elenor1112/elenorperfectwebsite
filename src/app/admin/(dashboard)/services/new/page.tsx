import type { Metadata } from 'next';
import { ServiceForm, emptyService } from '../ServiceForm';

export const metadata: Metadata = { title: 'New service' };
export const dynamic = 'force-dynamic';

export default function NewServicePage() {
  return <ServiceForm initial={emptyService} />;
}
