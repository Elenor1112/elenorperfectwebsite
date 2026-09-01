import { Module } from 'node:module';

/**
 * Test bootstrap.
 *
 * `server-only` throws on import outside a React Server Component, which is
 * exactly the protection we want in the app but makes server modules
 * unloadable under the plain Node test runner. Stubbing the specifier keeps
 * the real guard in production builds while letting the suites import the
 * modules it protects.
 */
type Loader = (
  request: string,
  parent: NodeJS.Module | undefined,
  isMain: boolean,
  options?: unknown,
) => unknown;

const moduleInternals = Module as unknown as { _load: Loader };
const originalLoad = moduleInternals._load;

moduleInternals._load = function patchedLoad(request, parent, isMain, options) {
  if (request === 'server-only' || request === 'client-only') return {};
  return originalLoad.call(this, request, parent, isMain, options);
};
