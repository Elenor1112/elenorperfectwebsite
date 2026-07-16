import { notFound } from 'next/navigation';

// Catch-all: any URL that matches no real route 404s *inside* the (site)
// layout, so visitors get the styled not-found page with nav and footer.
export default function CatchAllNotFound() {
  notFound();
}
