# Foxy workspace limits and identity — 2026-10-31

Status: in progress. Validate input and clear workspace on identity expiry.

Status: completed. Composer rejects blank and >5000 Unicode code points without clearing input. Identity-required callback from Foxy or classroom client aborts and disposes controller exactly once, clears state and requests safe sign-in or verification redirect.

Checks: workspace test suite PASS 7; session/controller regression PASS 19; web:build and lint:boundaries PASS. RED observed first. Live browser and real provider not tested.
