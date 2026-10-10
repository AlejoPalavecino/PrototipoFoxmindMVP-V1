import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Writable } from 'node:stream';
import React from 'react';
import { renderToPipeableStream, renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { AppContext } from '../../context';
import { createDefaultAppSettings } from '../settings';
import { encodeRoute } from '../routing';
import * as routePresentation from '../useRoutePresentation';

const boundaryUrl = new URL('../../components/layout/RouteBoundary.tsx', import.meta.url);
const layouts = [
  { role: 'alumno', name: 'AlumnoLayout', pages: {
    dashboard: 'DashboardAlumno', estudia: 'EstudiaAlumno', aulas: 'AulasAlumno',
    progreso: 'ProgresoAlumno', mensajes: 'MensajesAlumno', config: 'ConfiguracionAlumno',
  } },
  { role: 'docente', name: 'DocenteLayout', pages: {
    dashboard: 'DashboardDocente', agenda: 'AgendaDocente', aulas: 'AulasDocente',
    progreso: 'ProgresoDocente', copiloto: 'CopilotoIADocente', mensajes: 'MensajesDocente', config: 'ConfiguracionDocente',
  } },
] as const;
function source(path: string) {
  return ts.createSourceFile(path, readFileSync(new URL(path, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function nodes(root: ts.Node, predicate: (node: ts.Node) => boolean): ts.Node[] {
  const found: ts.Node[] = [];
  function visit(node: ts.Node) {
    if (predicate(node)) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return found;
}
function compile(text: string) {
  return ts.transpileModule(text, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
}
async function boundary() {
  assert.ok(existsSync(boundaryUrl), 'Shared loading/error boundary must exist');
  return import('../../components/layout/RouteBoundary');
}

for (const layout of layouts) {
  const file = source(`../../components/layout/${layout.name}.tsx`);
  test(`${layout.name}: pages are module-scope lazy registrations with correct named adapters`, async () => {
    const eager = file.statements.filter(ts.isImportDeclaration)
      .filter(node => /views\//.test((node.moduleSpecifier as ts.StringLiteral).text));
    assert.equal(eager.length, 0, 'No eager page import, including barrels');
    for (const name of Object.values(layout.pages)) {
      const declaration = file.statements.filter(ts.isVariableStatement)
        .flatMap(statement => [...statement.declarationList.declarations])
        .find(node => node.name.getText(file) === name);
      assert.ok(declaration?.initializer, `${name} must be declared outside the component`);
      assert.match(declaration.initializer.getText(file), /^lazy\(/);
      const imports = nodes(declaration, node => ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) as ts.CallExpression[];
      assert.equal(imports.length, 1);
      assert.equal((imports[0].arguments[0] as ts.StringLiteral).text, `../../views/${layout.role}/${name}`);
      // Execute the production adapter, supplying only the exact named export.
      const Component = () => React.createElement('p', null, name);
      let requested = '';
      const initializer = declaration.initializer.getText(file).replace(/\bimport\(/g, 'loadPage(');
      // CommonJS exports is supplied explicitly rather than executing a page module.
      const run = new Function('exports', 'lazy', 'loadPage', compile(`exports.registration = ${initializer};`) + '\nreturn exports.registration;');
      const loader = run({}, (load: unknown) => load, async (path: string) => {
        requested = path;
        return { [name]: Component };
      }) as () => Promise<{ default: unknown }>;
      assert.equal((await loader()).default, Component);
      assert.equal(requested, `../../views/${layout.role}/${name}`);
    }
  });

  test(`${layout.name}: selected page alone suspends while navigation shell remains`, async () => {
    const { RouteBoundary } = await boundary();
    for (const [view, name] of Object.entries(layout.pages)) {
      const requests: string[] = [];
      const module = { exports: {} as Record<string, React.ComponentType> };
      // Evaluate the actual layout with controlled pending imports. This exercises
      // React.lazy/Suspense SSR without starting real browser feature modules.
      const execute = new Function('require', 'module', 'exports', 'loadPage', compile(file.text.replace(/\bimport\(/g, 'loadPage(')));
      execute((path: string) => {
        if (path === 'react') return React;
        if (path.endsWith('/context')) return { useAppContext: () => React.useContext(AppContext) };
        if (path === 'lucide-react') return new Proxy({}, { get: () => () => React.createElement('svg') });
        if (path.endsWith('/messagingStore')) return { messagingStore: { getUnreadCount: () => 0 } };
        if (path.endsWith('/RouteBoundary')) return { RouteBoundary };
        if (path.endsWith('/routing')) return { encodeRoute };
        if (path === '../../app/useRoutePresentation') return routePresentation;
        throw new Error(`Unexpected static dependency: ${path}`);
      }, module, module.exports, (path: string) => {
        requests.push(path);
        return new Promise(() => {});
      });
      const html = renderToStaticMarkup(React.createElement(AppContext.Provider, { value: {
        role: layout.role, view: view as keyof typeof layout.pages,
        settings: createDefaultAppSettings(), setRole() {}, setView() {}, updateSettings() {},
      } }, React.createElement(module.exports[layout.name])));
      assert.deepEqual(requests, [`../../views/${layout.role}/${name}`]);
      assert.match(html, /role="status"/);
      assert.match(html, /Cargando vista/);
      assert.match(html, /<aside/);
      assert.match(html, /<nav/);
      assert.match(html, /Configuración/);
      assert.match(html, /Cerrar sesión/);
      assert.match(html, /Cambiar rol/);
    }
  });

  test(`${layout.name}: boundary wraps page content only and uses durable URL identity`, () => {
    const boundaries = nodes(file, node => ts.isJsxElement(node) && node.openingElement.tagName.getText(file) === 'RouteBoundary') as ts.JsxElement[];
    assert.equal(boundaries.length, 1, 'One shared page boundary inside the shell');
    const pageBoundary = boundaries[0];
    assert.equal(nodes(pageBoundary, node => ts.isJsxElement(node) && ['aside', 'nav'].includes(node.openingElement.tagName.getText(file))).length, 0);
    for (const [view, name] of Object.entries(layout.pages)) {
      assert.match(pageBoundary.getText(file), new RegExp(`view === '${view}' && <${name} />`));
    }
    assert.match(pageBoundary.openingElement.getText(file), /routeKey=\{encodeRoute\(/);
    assert.match(pageBoundary.openingElement.getText(file), new RegExp(`role: '${layout.role}'`));
    assert.match(pageBoundary.openingElement.getText(file), /view, navigationParams/);
  });
}

test('App lazily selects role layouts without enclosing settings/accessibility/toasts', () => {
  const app = source('../../App.tsx');
  assert.equal(app.statements.filter(ts.isImportDeclaration)
    .filter(node => /layout\/(Alumno|Docente)Layout/.test((node.moduleSpecifier as ts.StringLiteral).text)).length, 0);
  for (const name of ['AlumnoLayout', 'DocenteLayout']) {
    const declaration = app.statements.filter(ts.isVariableStatement)
      .flatMap(statement => [...statement.declarationList.declarations]).find(node => node.name.getText(app) === name);
    assert.ok(declaration?.initializer);
    assert.match(declaration.initializer.getText(app), new RegExp(`lazy\\(.*import\\(.*${name}.*default:.*${name}`, 's'));
  }
  const boundaries = nodes(app, node => ts.isJsxElement(node) && node.openingElement.tagName.getText(app) === 'RouteBoundary') as ts.JsxElement[];
  assert.equal(boundaries.length, 1);
  assert.doesNotMatch(boundaries[0].getText(app), /AccessibilityPanel|Toaster|RoleSelection/);
  assert.match(app.text, /<AccessibilityPanel \/>/);
  assert.match(app.text, /<Toaster \/>/);
});

test('loading feedback is accessible and Spanish', async () => {
  const { RouteBoundary } = await boundary();
  const Pending = React.lazy(() => new Promise<{ default: React.ComponentType }>(() => {}));
  const html = renderToStaticMarkup(React.createElement(RouteBoundary, { routeKey: '/alumno/dashboard' }, React.createElement(Pending)));
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Cargando vista/);
});

test('error state shows honest reload recovery; reset is only on changed durable route', async () => {
  const { RouteErrorBoundary } = await boundary();
  const props = { routeKey: '/alumno/aulas/class-1', children: React.createElement('p', null, 'page') };
  const instance = new RouteErrorBoundary(props);
  const failed = { ...instance.state, ...RouteErrorBoundary.getDerivedStateFromError(new Error('Chunk unavailable')) };
  instance.state = failed;
  const errorView = instance.render() as React.ReactElement<{ children: React.ReactNode }>;
  const html = renderToStaticMarkup(errorView);
  const button = React.Children.toArray(errorView.props.children).find(child =>
    React.isValidElement(child) && child.type === 'button') as React.ReactElement<{ onClick: () => void }>;
  let reloads = 0;
  new Function('window', `return (${button.props.onClick.toString()})();`)({ location: { reload: () => { reloads++; } } });
  assert.equal(reloads, 1, 'Recovery reloads the current URL instead of retrying the cached loader');
  assert.match(html, /role="alert"/);
  assert.match(html, /No se pudo cargar esta vista/);
  assert.match(html, /Recargar página/);
  assert.doesNotMatch(html, /Chunk unavailable|Reintentar/);
  assert.equal(RouteErrorBoundary.getDerivedStateFromProps({ ...props }, failed), null);
  for (const routeKey of ['/alumno/aulas/class-2', '/alumno/mensajes/thread-1', '/docente/aulas/class-1']) {
    const reset = RouteErrorBoundary.getDerivedStateFromProps({ ...props, routeKey }, failed);
    assert.deepEqual(reset, { routeKey, hasError: false });
  }
  // State reducer and SSR evidence only: server rendering does not catch errors
  // with error boundaries, and cannot prove mounted browser transitions.
  instance.state = { ...failed, ...RouteErrorBoundary.getDerivedStateFromProps({ ...props, routeKey: '/alumno/config' }, failed)! };
  assert.match(renderToStaticMarkup(instance.render()), /page/);
});

test('React consumes and caches a rejected lazy load without an automatic retry loop', async () => {
  const { RouteBoundary } = await boundary();
  let loads = 0;
  const failure = new Error('Rejected route chunk');
  const Rejected = React.lazy(() => {
    loads++;
    return Promise.reject(failure);
  });
  async function renderRejected() {
    const errors: unknown[] = [];
    let html = '';
    await new Promise<void>((resolve, reject) => {
      const output = new Writable({
        write(chunk, _encoding, done) { html += chunk.toString(); done(); },
      });
      output.on('finish', resolve);
      output.on('error', reject);
      const stream = renderToPipeableStream(React.createElement('main', null,
        React.createElement('nav', null, 'Navigation shell'),
        React.createElement(RouteBoundary, { routeKey: '/docente/agenda' }, React.createElement(Rejected))), {
        onAllReady() { stream.pipe(output); },
        onError(error) { errors.push(error); },
        onShellError: reject,
      });
    });
    assert.deepEqual(errors, [failure]);
    assert.match(html, /Navigation shell/);
    assert.match(html, /role="status"/);
    // SSR reports rejection to onError, not to the client error boundary. The
    // client error UI/reset reducer is tested separately; no mounted claim.
  }
  await renderRejected();
  await renderRejected();
  assert.equal(loads, 1);
});

test('route identity ignores transient actions, distinguishes supported resource IDs', () => {
  const route = { role: 'docente' as const, view: 'aulas' as const, navigationParams: { openAulaId: 'class-1' } };
  assert.equal(encodeRoute(route), encodeRoute({ ...route, navigationParams: { ...route.navigationParams, initialPrompt: 'private transient action' } }));
  assert.notEqual(encodeRoute(route), encodeRoute({ ...route, navigationParams: { openAulaId: 'class-2' } }));
  assert.notEqual(encodeRoute({ role: 'alumno', view: 'mensajes', navigationParams: { conversationId: 'thread-1' } }), encodeRoute({ role: 'alumno', view: 'mensajes', navigationParams: { conversationId: 'thread-2' } }));
});
