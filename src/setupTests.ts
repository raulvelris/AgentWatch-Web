// Setup global de Vitest (ver vite.config.ts -> test.setupFiles).
// - Matchers de jest-dom (toBeInTheDocument, toHaveClass, ...) para expect de vitest.
// - Desmonta los componentes y limpia los storages entre tests: varios tests
//   dependen de localStorage/sessionStorage (selector de agente, sesión JWT).
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom no implementa scrollIntoView (lo usa el autoscroll del log de deploy).
Element.prototype.scrollIntoView = () => {};

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // Los vi.fn de los vi.mock de módulos no se tocan con restoreAllMocks:
  // sin este reset, las llamadas se acumulan entre tests del mismo archivo.
  vi.resetAllMocks();
});
