# Foxy controller pagination — 2026-10-31

Status: in progress. RED confirmed for overlap ordering/deduplication and conversation cursor.

Status: completed. Turn pages merge by ID or sequence and remain sorted, preserving authoritative state already received by polling. Conversation cursor is exposed via nextConversationCursor and loadMoreConversations, with existing epoch/abort fencing.

Checks: RED observed for both additions; `node --test --test-reporter=dot apps/web/src/lib/foxy-chat-controller.test.mjs` PASS 10; `npm run web:build` PASS; `npm run lint:boundaries -- --quiet` PASS. UI must expose conversation pagination; independent end-to-end remains pending. No real provider/data or deployment.
Follow-up: terminal ACK no longer sets activeTurn, even if subsequent GET fails; does not replay accepted intent. RED observed, full controller suite PASS 11, build and boundaries PASS again.
