'use client';

import { Component, type ReactNode } from 'react';

// Local error boundary for WebGL canvases. If the 3D layer faults (lost context,
// an extension mutating its portal, a teardown race), we silently drop to the
// static fallback already painted underneath instead of crashing the page.
export class CanvasBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.warn('3D layer disabled after error:', error);
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
