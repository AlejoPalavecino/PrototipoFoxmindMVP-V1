import React, { Component, Suspense, type ReactNode } from 'react';

interface RouteBoundaryProps {
  routeKey: string;
  children?: ReactNode;
}

interface RouteErrorState {
  routeKey: string;
  hasError: boolean;
}

export class RouteErrorBoundary extends Component<RouteBoundaryProps, RouteErrorState> {
  state: RouteErrorState = { routeKey: this.props.routeKey, hasError: false };

  static getDerivedStateFromError(_error: unknown) {
    return { hasError: true };
  }

  static getDerivedStateFromProps(props: RouteBoundaryProps, state: RouteErrorState) {
    // Use the canonical role/view/resource URL, not transient payloads or render
    // identity. Reset the error without remounting a healthy page on ID changes.
    return props.routeKey !== state.routeKey
      ? { routeKey: props.routeKey, hasError: false }
      : null;
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-6 text-fox-text-main">
          <p>No se pudo cargar esta vista.</p>
          <p className="mt-2 text-sm text-fox-text-muted">Puedes cambiar de vista o recargar esta página.</p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-fox-orange px-4 py-2 font-bold text-white"
            onClick={() => window.location.reload()}
          >
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function RouteBoundary({ routeKey, children }: RouteBoundaryProps) {
  return (
    <RouteErrorBoundary routeKey={routeKey}>
      <Suspense fallback={
        <div role="status" aria-live="polite" className="p-6 text-fox-text-muted">
          Cargando vista…
        </div>
      }>
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}
