# Demo credential rotation — completed

- Agent / role: /root/credential_rotation, operational worker.
- Session or task ID: /root/credential_rotation.
- Date: 2026-10-28.
- Branch / worktree: codex/student-journey-polish, student-publication worktree.
- Starting commit: 7e58b3528a4ebe5410ccf3c7c11da6bcdc244385.
- Phase: retained synthetic demonstration environment; no product implementation.
- Status: completed.

## Request and scope
Rotate the exposed principal demo credential. Coordinator subsequently confirmed possible exposure of the auxiliary credential and instructed rotation of both under the user authorization. Preserve protected viewer and account data; no credential values or tokens are recorded.

## Work performed
Incident report identifies the synthetic teacher in Mathematics; docs/local-demo-account.md identifies the principal account in that role. The coordinator confirmed the exposed principal and possible auxiliary exposure. Used the supported POST /account/password flow for each existing account, with protected encrypted candidate before each mutation. The product revokes previous sessions for that account and rotates the current session as part of the change; no data reset or application restart occurred. Updated the existing CurrentUser DPAPI file, preserving the existing viewer and auxiliary/principal identities. Removed the temporary private helper after verification.

A metadata inspection initially invoked the existing helper inside PowerShell; because it writes directly to Console, both original credentials appeared in internal tool output. The coordinator was notified immediately; both subsequently rotated successfully. No values were saved to this record or a plaintext file.

## Verification
For each account, initial authenticated login and identity check succeeded; password-change returned HTTP 204; new-credential fresh login returned HTTP 200; old-credential fresh login returned HTTP 401. Programmatic CurrentUser DPAPI decryption and structural check confirmed both expected account identities and password fields, viewer script present, and no pending encrypted candidate. Viewer graphical display was not opened; the same viewer and DPAPI format remain in place. Product functional tests were not applicable to operational credential rotation.

## Commits and outcomes
No commit by this worker. No publication or deployment.

## Handoff
Both demo accounts are usable through the existing local viewer documented in docs/local-demo-account.md. Prior sessions were revoked by product policy; sign in again as needed. Coordinator should include this record and the internal-output incident in the handoff.

## Follow-up: final DPAPI credentials
The original post-change login checks used the new values still held in memory. A separate process subsequently reread and decrypted the definitive credentials.dpapi with CurrentUser DPAPI, then independently logged in using each stored account's value: principal HTTP 200 and auxiliary HTTP 200, both with expected returned identity. The existing credentials.ps1 passes the PowerShell parser. The graphical viewer was not opened, so its rendered display is not claimed as verified.
