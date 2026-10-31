# Foxy publication list HTTP E3E — 2026-10-31

Status: in progress. Exact GET path with bounded cursor and limit at route and proxy.
Completed: GET resource publications routes to read service, defaults 20, limits 1..50, UUID cursor; proxy forwards only exact route/method and query, rejects invalid values. HTTP/proxy suites PASS 19, web tsc, api:build and lint:boundaries PASS. No retained data or provider.
