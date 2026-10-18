# P7 T2→T1 compatibility diagnostic — stale teacher revision

- Agent/task: /root/p7_t1_diagnostic, read-only Sol/xhigh; persisted by /root coordinator.
- Date:2026-10-18; branchcodex/p7-activities, T1basea5aeee6.
- Status: bounded diagnostic completed; compatibility proof initially partial.

One external instrumented actual authoring journey, unchanged330/360s bounds, existing fresh builds, exit1/2leafPASS/2FAILincludingroot/1SKIP. Safe observed sequence: createassignment200/revision0→1, authoringmutation200/1→2, publish200/2→3, actualstudentstart200, createquestionnaire409/CONFLICT/requestedrevision3. No nonOKCSRFobserved. Source T2start advancesclassroomrevision; teachercreation correctlyrejectsstaleexpectedrevisionbeforeinsert. Latestnumericrevisionnotdirectlysampled, distinctionretained. This is not evidence of current-revision creation failure.

All229sourceentries unchanged; canonicaltestSHA6f8af1ca364de2df37adb87904d692dd9a7e685f2b8cf3187a4eaf4952355dd0 before/after. Cleanup0both/stderr0, no retries/sleeps/extraAPIrequests/corrections. Retained OSscratch foxmind-p7-t2-t1-diagnostic-aqfmP2 andbrowserfoxmind-p7-authoring-xSa2wS.

Coordinator disposition: legitimate optimistic concurrency on cross-actor start, not a candidate defect authorizing another product correction. Parent updates only the compatibility harness to use the existing visible Actualizar actividades after another actor changed state, assert successful detail/list responses, and assert each create response before looking for its editor. No application auto-retry, rate reset, timeout/security/revision relaxation. One scoped valid-current-revision compatibility proof remains required; original failures remain historical. New valid-request defect after that must stop, not loop.

## Scoped valid-current-revision proof unavailable
Solecanonicalexecutionafterharnessrefresh endedstatusnull/SIGTERM/ETIMEDOUT atconfiguredchild360000ms/test330000ms. Only75stdoutbytes: ownedP4ready/firstCombinedPrismamigrateexit0; noTAP/browser/assertion/cleanupconfirmation, stderr0.229sourceentriesunchanged/canonicalSHAde564c87881c34f008159706a2ebdc4898a79b151ebee422d8b757d6003b3ee6. Retainedfoxmind-p7-t2-t1-proof-xa7Hbq. Toolwalltimewasunusuallylong, rootcauseunproved; noouterretry/budgetchange. Originalcompatibility2PASS2FAIL1SKIP remains.

## Coordinator incident containment
Stoppedsourcewrites/capturedGitstatus. ReadonlyDockerinventoryfoundonlyownedfixtureprefixfoxmind-p4-1aeaacec78aa3492; exactownerlabel1aeaacec78aa3492/mountstoactiveworktreeignoredfixturefolder/creationtimeverified. ParentcheckedownerBEFOREeachaction, removedexact3containers/2namedvolumes/network, alloperations0; finalexactownerinventoriesempty. Noforeign/developmentMailpit/retaineddata/scratchdeleted. Test'sownprocesscleanupstillunconfirmed; postincidentDockerresourcecleanupindependentlyconfirmedbycoordinator, notretroactivehelpercleanupPASS. NoP7proof/acceptanceinferred. Onehuman decisionneededbeforeanotherexecution; no T3dependentimplementationorP8/merge/push.


## Explicitly authorized single repetition — PASS
LatestuserL11authorizedexactoneunchanged360srepeat. /root/p7_t1_diagnostic executedcanonicaltestONCE, exit0/4leaf5TAPPASS/0fail-skip-cancel, actualRetryAfter42sonce, child118.79s/TAP118.59swithin330/360. Process/resourcecleanup0/stderr0,229sourceentriesunchanged/canonicalSHAde564c87881c34f008159706a2ebdc4898a79b151ebee422d8b757d6003b3ee6. RetainedrepeatLnQ3ic/browserYt9CLu, nofilesdeleted. Authorizationconsumed, originaltimeout/failuresremainhistorical. ScopedT2owncompatibilityproofcompleted, notfinalP7independentacceptance.

