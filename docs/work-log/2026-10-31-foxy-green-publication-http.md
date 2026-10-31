# Foxy publication HTTP E3B — 2026-10-31

Status: in progress. Connect prepare, inspect and confirm using existing auth/admission/security transport.
Completed: routes POST resource/publications 202/200, GET publication 200, POST confirm 200 with strict UUID/query/body parsers and existing real admission. Runtime composes service with actual FileStore-backed publisher and confirmation repository. New HTTP suite PASS 2, runtime suites PASS 6, api:build and boundaries PASS. Existing foxy-http source suite could not import Foxy index under Node: isolated host.ts and index.ts throw SyntaxError while http.ts and runtime.ts import successfully; compiled host auth/CSRF integration still pending. No retained DB or real provider.
Compiled application regression with real HTTP/session/CSRF and synthetic PostgreSQL PASS 1; it covers host authentication generally, not the new publication endpoints specifically.
