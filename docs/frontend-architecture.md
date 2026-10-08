# Frontend architecture and extension guide

Extend the existing feature owner rather than moving state into a shared component.
Keep headless behavior independent of React presentation and app composition;
use public feature seams when coordinating features. This guide describes the
current frontend contracts, not a new backend or persistence design.

## Choose the owner first

| Area | Ownership and public entry points |
| --- | --- |
| Classrooms | [index.ts](../src/features/classrooms/index.ts) exposes headless domain, model, data and application APIs. [ui.ts](../src/features/classrooms/ui.ts) exposes presentation components and hooks. |
| Messaging | [messagingStore.ts](../src/features/messaging/messagingStore.ts) owns mutable conversations, listeners and the eagerly exported singleton. [messagingPersistence.ts](../src/features/messaging/messagingPersistence.ts) contains functional browser-storage helpers. |
| Study | [Flashcard.ts](../src/features/study/model/Flashcard.ts) contains type-only interfaces. Application helpers construct resources and score quizzes; [quizProgress.ts](../src/features/study/application/quizProgress.ts) is one pure helper. |
| App composition | [navigation.ts](../src/app/navigation.ts) and [settings.ts](../src/app/settings.ts) provide type contracts and fresh defaults. [App.tsx](../src/App.tsx) and root context own settings, role/view selection, providers and effects. |

Presentation owns interaction lifetimes, not a second copy of feature behavior.
The study workspace still owns React state, timers, clock, canvas, messages and
session lifetimes. SharedMessagingHub consumes messaging state/subscriptions;
it does not own storage. Do not introduce a shared layout, router or context
factory merely to extend these features.

## Dependency direction and compatibility

Headless code may coordinate with other headless code, but must not reach
presentation or app runtime, even through an intermediate local module.
UI-to-store dependencies remain valid. Headless feature code must not import app runtime.
Inside a feature, implementation modules use leaf imports to avoid barrel cycles.
Shared classroom consumers use the headless entry point; presentation consumers
use its UI entry point. See [Public import boundaries](../src/features/classrooms/README.md)
for classroom contracts, volatile/in-memory repositories and compatibility aliases.
Those repositories are not one universal backend-adapter interface.

Some study types, including `StudyGeneratedResource`, still come from
[estudioTypes.ts](../src/views/alumno/estudio/estudioTypes.ts) through type-only use.
This intentional compatibility erases at runtime; not all models are feature-owned.
Preserve fixture/reference identity and cross-role ownership semantics when
extending classroom behavior rather than replacing them with a new abstraction.

### What the dependency guard covers

The existing [classroomImportBoundaries.test.ts](../src/features/classrooms/tests/classroomImportBoundaries.test.ts)
is discovered by the existing `npm test` globs. Its ten scoped cases cover
parser, cycle, barrel and page behavior plus four dependency-direction cases.
The runtime local graph protects these headless roots:

- The classrooms, messaging and study `model`, `data`, `application` and `fixtures` directories.
- The classroom headless index and messaging store/persistence entry points.

These roots cannot transitively reach views, shared components, the app directory,
root App/context, or feature components, hooks and `ui.ts` presentation barrels.
Neutral legacy bridges and cycles are checked with deduplication; unresolved
local executable imports fail the existing engine, and local cycles must be zero.

This is not a generic ban on every feature file or cross-feature internal import,
nor a universal dependency-injection rule. Directory categories apply to the
three listed features only. New features or headless entry paths need explicit
policy coverage and tests. Type-only use (including ordinary imports used only
as types), external packages and computed imports are outside runtime coverage.
Future React plugins or dynamic imports require manual review and extension tests.

## Extend behavior without changing its contract

### Classrooms and cross-feature invitations

- [ ] Choose the headless or UI public entry point appropriate to the consumer.
- [ ] Preserve repository-specific contracts, compatibility aliases and reference ownership.
- [ ] Keep cross-feature coordination on the public classroom seam.
- [ ] Preserve the synchronous invitation sequence described below.

[classroomInvitation.ts](../src/features/messaging/application/classroomInvitation.ts)
receives current-conversation, read, notify and enrollment callbacks. Acceptance
updates status and enrolls before the confirmation reply, synchronously.
Its `ClassroomEnrollment` import is type-only; this seam does not imply a new
provider, universal backend enrollment transaction or real authentication.

### Messaging state, fixtures and storage

- [ ] Keep mutable state, listeners and singleton allocation in the store.
- [ ] Keep mutation helpers supplied with read, notify and enrollment callbacks.
- [ ] Preserve save-before-listener notification and unsubscribe behavior.
- [ ] Obtain fresh fixture graphs; do not share a mutable module-level fixture.
- [ ] Preserve synchronous fallback/error behavior before replacing storage helpers.

The store delegates loading to functional helpers. Notification saves before
calling current listeners, and subscription returns an unsubscribe function.
Do not change ownership timing, mock timing or module allocations as a side effect.
[createInitialConversations](../src/features/messaging/fixtures/initialConversations.ts)
returns a fresh conversation array on each call.

The current persistence seam is deliberately small:

- `loadMessagingConversations(initial, assign, save): void` assigns loaded JSON,
  or assigns the fallback before saving. Load errors take the fallback path.
- `saveMessagingConversations(readConversations): void` writes browser localStorage
  using the fixed existing key; save errors are swallowed.

These functions are a storage-replacement seam, not a general adapter or
Promise-ready backend. Any future asynchronous redesign needs separate
behavior authorization and test-first contracts for fallback, errors,
synchronous callbacks and notification order; it is not required for extensions.

### Study resources and app composition

- [ ] Keep resource-generation and quiz-scoring helpers pure and provider-independent.
- [ ] Keep resource/response selection in [studyChatResponse.ts](../src/features/study/application/studyChatResponse.ts), with explicit canvas/save callbacks.
- [ ] Retain type-only legacy compatibility unless a separately scoped migration replaces it.
- [ ] Leave workspace state, timers and session lifetimes with their existing owner.
- [ ] Keep app composition at the root and preserve role-UI callback payload identity/lifetimes.

Flashcard, quiz, concept-map and summary generation helpers construct resources
without a provider. Extending them does not require AI integration, a backend,
or moving React state into headless modules. App contracts and fresh defaults
are separate from root runtime wiring; do not reverse that dependency.

## Checking changes and limits

Use the existing test workflow for the dependency guard and affected contracts.
The existing `npm run lint` script performs TypeScript no-emit checking; no new
package runner, dependency or configuration is needed by default.

The available verification record is ten passing scoped guard callbacks and a
configured TypeScript no-emit check with no errors. It is not evidence of a full
`npm test` run, build, browser exercise or final acceptance; those remain separate.
Documentation changes here do not execute or replace those checks.

Visual redesign, real authentication, databases, backend/AI integration, new
features, persistence redesign and dependency/configuration changes are outside
this guide's extension scope. Authorize and test any such behavior separately.
