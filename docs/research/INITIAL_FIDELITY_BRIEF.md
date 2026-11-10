# Initial brief: stream fidelity and physiological coaching UX

Submitted for Product Owner review, 8 November 2026.

Scope: COROS, Garmin, Strava, TrainingPeaks and intervals.icu. Public primary
documentation only. No account access, API payload tests, private algorithms,
marketing/pricing analysis, vanity metrics, user research or app changes.
Documented capability is not directly observed runtime behavior. No finding
becomes a task, backlog entry or PR scope without explicit Product Owner approval.
This brief does not delay or unlock pipeline PRs 3-7 before PRs 1/2 completion.

## Evidence comparison

| Platform | Documented evidence | Physiological UX implication / limitation |
| --- | --- | --- |
| COROS | Its MCP guide separates basic queries from FIT retrieval; deeper GPS/interval analysis needs FIT. Cycling power is absent from standard queries. FIT requests are capped at 50 per calendar day. [1] | Missing summary power does not establish that a recording lacks power. Rate-limited FIT retrieval must not be mistaken for a summary-only recording. This is interpretation, not a TPL runtime result. |
| Garmin | Activity API offers summaries or FIT files and lists full activity files. Multi-project support and backfill on the inspected page are marked Enterprise-only. [2] | TPL's actual partner tier, historical access, recovery fields and FIT delivery remain unknown. API availability is not evidence of TPL entitlement or successful sync. |
| Strava | The API has a separate activity-stream endpoint and channel models for time, HR, power, cadence and altitude. Stream metadata includes original_size, resolution and series_type. [3] | A stream response does not prove uniform one-second samples or equivalence to an original file. Actual timestamps/channels need inspection; this brief did not inspect payloads. |
| TrainingPeaks | Its help describes channel-dependent zone reports: without recorded HR there is no HR time-in-zone graph. Expanded analysis requires a file. [5] | The documented journey progresses from compliance/summary to detailed file analysis. A summary compliance color is not a full physiological judgment. Exact validation and retention algorithms remain unknown. |
| intervals.icu | Official API documentation lists FIT/TCX/GPX/ZIP/GZ activity upload/download, wellness exchange and webhooks. [7] | Official analysis pages describe interval detection, HR/power charts, correction and decoupling; progress/wellness views contextualize training and recovery. [8-10] Supported formats do not prove lossless channel preservation or missing-data behavior. |

## Physiological interpretation patterns

- Strava documents Fitness/Fatigue/Form based on Training Load and/or Relative
  Effort. Inputs can include power, HR or perceived exertion; for eligible
  histories it describes modeled fill-in of load for rides without power.
  Its chart links contributing activities to the selected point. [4]
  This is a documented product choice, not evidence of an undisclosed defect.
- TrainingPeaks explains recalculation from athlete thresholds and provides a
  file-level correction/reupload path. [6] This is evidence that metric correction
  and traceability are useful UX patterns already present elsewhere, not a novel
  TrainPaceLab superiority claim.
- intervals.icu documents fitness/fatigue/form views and analysis help alongside
  recovery/wellness context. [8-10] Public pages do not establish whether its
  advice is non-blocking for every missing-data case.
- COROS documents the difference between querying available summaries and
  requesting the raw data needed for deeper analysis. [1] The scope here does
  not establish how any competitor handles every pending or failed import.

## Interpretation for Product Owner review only

1. Original files, provider streams and summaries are separate fidelity classes.
   Treating them identically would hide availability and sampling constraints.
2. A possible UX hypothesis is that athletes benefit from seeing which channels
   arrived and which analyses exclude incomplete input. Public evidence does
   not show that competitors universally lack this capability.
3. A second hypothesis is that one recommendation tied to visible source data
   and a correction path is more useful than additional scores. This requires
   athlete testing; this brief is not evidence of better outcomes or conversion.

These are review observations, not accepted requirements or implementation tasks.
The existing approved stream-only zones, provenance and non-blocking coach rules
remain unchanged independently of this research.

## Questions for the Product Owner

- Should completeness/freshness stay in existing workout and recommendation
  panels, or is a separate quality view worth testing later?
- Which pending/missing-data wording do athletes understand without assistance?
- What source-level proof would justify a claim about TrainPaceLab's fidelity?

No decision is assumed, and no engineering task is created from these questions.

## Evidence gaps

No end-to-end provider sync, byte/channel retention comparison, private API
entitlement, actual competitor UI interaction, response timing or athlete user
test was performed. TPL real-account Garmin/COROS health remains unverified.
Source retrieval date is not necessarily the vendor's publication date.

## Primary sources checked

All retrieved 8 November 2026; statements above are paraphrased.

1. COROS, Connect Your COROS to AI (page updated 18 September 2026):
   https://support.coros.com/hc/en-us/articles/50841795180948-Connect-Your-COROS-to-AI
2. Garmin Activity API:
   https://developer.garmin.com/gc-developer-program/enterprise/activity-api/
3. Strava API v3 reference, Streams and stream models:
   https://developers.strava.com/docs/reference/
4. Strava, How Fitness & Freshness is Calculated (17 September 2026):
   https://support.strava.com/en-us/articles/15402032-how-fitness-freshness-is-calculated
5. TrainingPeaks, How to Analyze a File:
   https://help.trainingpeaks.com/hc/en-us/articles/208916857-How-to-Analyze-a-file-in-TrainingPeaks
6. TrainingPeaks, How and Why to Recalculate Workout Metrics:
   https://help.trainingpeaks.com/hc/en-us/articles/204071794-How-and-Why-to-Recalculate-Workout-Metrics
7. Intervals.icu Open API:
   https://www.intervals.icu/features/open-api/
8. Intervals.icu Analyze Your Activities:
   https://www.intervals.icu/features/analyze/
9. Intervals.icu Track Your Progress:
   https://www.intervals.icu/features/track/
10. Intervals.icu Wellness:
    https://www.intervals.icu/features/wellness/
