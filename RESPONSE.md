# Part A: Product Thinking

**Summary.** The customer asked for a solution (block submitting until every
AI suggestion has a response), but there are three different needs behind
it: fewer avoidable review rounds, proof that suggestions were considered,
and not slowing people down. Recording a response is not the same as
blocking. I would always record responses in an audit log, and make the
pre-submit check a per-workspace setting: **off**, **warn**, **block only
high-severity suggestions**, or **block all** (the customer's literal ask).
I'd start this customer on "warn", move to "block high-severity" once data
shows those are the suggestions that cause rework, and keep "block all"
available if they confirm a compliance need. Assumptions are labelled
A1…, open questions OQ1….

## 1. Questions I Would Ask

The three marked ★ change the shape of the solution; the others refine it.

**Problem and outcome**

1. ★ **What triggered this request?** A specific incident (a failed audit,
   a costly bounced piece of content) or a general feeling that reviews take
   too long? Roughly how many extra rounds happen, and what does one cost?
   _Why:_ a compliance driver justifies a hard gate and immutable records;
   an efficiency driver usually doesn't.
2. **If this works, which number is different in three months, and how much
   slower can submitting get before it's a problem?** _Why:_ a success
   metric and a guardrail, agreed before building.

**What counts as a response**

3. ★ **What does "actively reviewed and given a response" mean?** Accept,
   dismiss, dismiss with a reason, or fixing the text yourself? Would
   "dismiss all" be acceptable? _Why:_ this defines the data model. If
   "dismiss all" is fine, they want a record, not a gate.
4. **Should reviewers see the responses and be able to challenge a
   dismissal?** _Why:_ reviewer visibility may cut rounds more than blocking
   does.

**Suggestions and trust in the AI**

5. ★ **Are all suggestions equally important?** Which kinds caused the extra
   rounds (legal claims, facts, brand tone, grammar), and how often is the
   AI wrong? _Why:_ if a few categories cause most rework, gating only those
   solves the problem with a fraction of the friction. Forcing a decision on
   noisy suggestions trains people to click "dismiss" without reading, which
   also makes the audit trail worthless.
6. **How many suggestions does a typical piece get, and the worst case?**
   _Why:_ 5 and 80 suggestions are different products.

**People, scope and audit**

7. **Who submits (staff, agencies, occasional contributors) and who
   reviews? Which stakeholder view comes from which role?** _Why:_ the
   friction lands on authors, the benefit on reviewers and compliance.
8. **Should this apply to every team and content type, who controls the
   setting, and can anyone bypass it on a deadline?** _Why:_ every gate
   needs an escape hatch, or people invent workarounds.
9. **Who reads the audit trail (internal QA, an auditor, a regulator) and
   what must it prove?** Retention, export, immutability, which AI model
   produced the suggestion? _Why:_ decides storage and whether export is
   needed in v1.
10. **(Internal) Have other customers asked for this, or the opposite?**
    _Why:_ one customer's request shouldn't silently change the product for
    everyone.

**Edge cases**

11. **When content is edited and suggestions are regenerated, should
    earlier dismissals carry over? After a reviewer sends it back, does the
    author respond to everything again or only to new items?** _Why:_
    without carry-over people re-dismiss the same items after every edit.
12. **If the AI is slow or down at submit time, should submission be
    blocked or allowed? Do API and integration submissions follow the same
    rule?**

## 2. How I Would Gather More Information

Goal for the week: arrive at the customer call with data and a
recommendation, without changing anything users see.

**Product data (days 1–2).** I'd frame each check as a hypothesis with a
decision either way:

| Hypothesis                                                        | What I'd look at                                                                                                                                                      | If true                                        | If false                                                                                             |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| H1. Users don't _see_ suggestions (visibility, not unwillingness) | Share of suggestions viewed before submit; acceptance rate when viewed                                                                                                | Fix visibility; a pre-submit summary is enough | They see and skip them: check H2                                                                     |
| H2. Ignored suggestions cause the extra rounds                    | "Changes requested" rate for submissions with open high-severity suggestions vs none; hand-tag 30–50 reviewer rejection comments for overlap with ignored suggestions | Gate exactly those categories                  | The rounds come from elsewhere and a gate adds friction for nothing. **The most important finding.** |
| H3. AI noise is concentrated in some categories                   | Dismiss and ignore rate by category and model version                                                                                                                 | Those categories never block                   | A broader gate is safer                                                                              |
| H4. Friction would be real                                        | Suggestions per item (median, p90); time from first suggestion to submit; edit-and-regenerate cycles                                                                  | Bulk actions and carry-over are must-haves     | A simple gate may be fine                                                                            |
| H5. This customer is an outlier                                   | The same metrics for other customers                                                                                                                                  | Make it a setting, not a default               | Consider "warn" for everyone                                                                         |

If these events aren't tracked today, that is finding number one, and I'd
add analytics-only events this week to start a baseline.

**Shadow mode (days 3–5).** Behind a flag, calculate for every real
submission what each policy (off, warn, block high-severity, block all)
_would have done_, and log it without showing users anything. Within days
that gives real friction numbers, such as "block all would have stopped X%
of submissions, at a median of Y extra clicks", at zero risk to users.

**People (days 2–3).**

- **CS / account manager:** the exact wording, who asked (a compliance lead
  or a team lead), urgency (is a renewal involved?), any incident, and
  examples of bounced submissions.
- **Sales notes and the contract:** was an audit trail promised or a buying
  criterion?
- **Support tickets:** "can't submit", "AI suggestion wrong", "rejected
  again".
- **3–5 short calls** with authors and reviewers at other customers: "Walk
  me through what you do with suggestions before you submit."
- **AI team:** precision by category, whether suggestions have a severity,
  and whether a suggestion keeps its identity when regenerated.
- **Engineering:** is submission enforced in one place on the server, and
  how are suggestions stored?
- **Internal legal:** what regulated customers expect from an audit trail,
  and GDPR handling of user IDs and free-text reasons.

**Similar products.** GitHub's optional "require conversation resolution
before merging" (per repository, admins can bypass), code-quality tools
that block only above a severity and let you mark a false positive with a
comment, and "accept all / reject all" in document editors. (From memory;
I'd check the details.)

**Prototype.** A clickable prototype of the warn and block dialogs, tested
with 3–5 users for understanding and time to submit.

**Output on day 5:** a one-page brief with the data, a recommended policy,
and the two or three questions still open for the customer.

## 3. Developer Ready Ticket

**Options considered**

| Option                                         | Fewer rounds                          | Audit                    | Low friction | Main risk                               |
| ---------------------------------------------- | ------------------------------------- | ------------------------ | ------------ | --------------------------------------- |
| Hard gate on all suggestions (the literal ask) | Partly: forces a click, not attention | Complete but low-quality | No           | Rubber-stamping; a regression if global |
| Warn before submit, log "submit anyway"        | Partly                                | Yes                      | Yes          | May not satisfy a compliance mandate    |
| Block only high-severity, warn on the rest     | Yes, targets what causes rework       | Yes, where it matters    | Yes          | Depends on severity quality             |
| Per-workspace setting with the modes above     | Depends on mode                       | Yes                      | Yes          | More configuration; capped at 4 modes   |

**Recommendation:** a per-workspace setting whose modes are the rows above,
with responses and the audit log always on. Default for everyone else:
**off** (no change). This customer: **warn** first, then **block
high-severity** for a pilot team.

---

### [Epic] Record responses to AI suggestions and add a configurable pre-submit check

**Context.** A customer asked us to block submission until every AI
suggestion has a response. Today users can submit without responding.
Stakeholders report extra review rounds from skipped suggestions, want an
audit trail, and worry a blanket rule will slow people down. Hypothesis:
most avoidable rounds come from a small set of high-severity suggestions
that were never acted on.

**Goals**

1. Every suggestion ends in an explicit, recorded state, and each submission
   records what was still unresolved.
2. Workspace admins choose how strict submission is.
3. Reviewers see what was accepted or dismissed, and why.

**Non-goals (v1):** improving the AI suggestions themselves; per-user or
per-content-type rules; an audit reporting UI or export (pending OQ1);
changes to the reviewer workflow beyond a read-only summary.

**User stories**

- As an **author**, I can accept or dismiss each suggestion (with a reason
  where required), so my decision is recorded and I'm not asked again.
- As an **author**, when I click Submit I see what's still open and can
  jump to each item.
- As an **author**, I can bulk-dismiss low-severity suggestions, so minor
  noise doesn't slow me down.
- As a **reviewer**, I see a summary of responses and dismissal reasons, so
  I can focus my review.
- As a **workspace admin**, I choose the mode, the severity threshold and
  who may override.
- As a **compliance lead**, I can see for any submitted version who
  responded to each suggestion, when, how and why.

**Acceptance criteria**

1. Given an open suggestion, when the author accepts or dismisses it, then
   its status changes and an audit event (user, time, content version,
   reason) is written in the same transaction.
2. Given a blocking suggestion and "reason required", when the author
   dismisses it without a reason, then nothing is saved and the reason
   field shows an error.
3. Given mode **off**, when the author submits with open suggestions, then
   the flow is exactly as today, and the submission stores how many were
   open. _(No regression.)_
4. Given mode **warn** and 3 open suggestions, when the author clicks
   Submit, then a dialog lists them with "Review" and "Submit anyway";
   "Submit anyway" submits and logs the open suggestion IDs.
5. Given mode **block high-severity**, with 1 open high and 4 open low,
   when the author clicks Submit, then nothing is submitted and the dialog
   lists the 1 blocker (with a link to it) and the 4 as warnings.
6. Given a block mode, when a client calls the submit API directly with
   open blockers, then it gets `409 SUBMISSION_BLOCKED` with their IDs.
   _(Enforced on the server, not only in the UI.)_
7. Given the dialog is open, when new blocking suggestions arrive before
   confirming, then confirming fails with the updated list.
8. Given a suggestion dismissed on version 3, when version 4 regenerates
   the same suggestion on unchanged text, then it stays dismissed and
   doesn't block. If the author's own edit removed the issue, it is marked
   "resolved by edit".
9. Given 10 open low-severity suggestions, when the author bulk-dismisses
   them with one reason, then all are dismissed; blocking suggestions can't
   be bulk-dismissed.
10. Given a user with override permission, when they submit with blockers
    and give a reason, then it succeeds and the override is logged.
11. Audit events can't be edited or deleted through any API, and responses
    on a submitted version are locked.

**Data model**

- `suggestions`: add `status` (open, accepted, dismissed, resolved by edit,
  outdated), `severity`, `category`, `model_version`, `fingerprint` (to
  match a suggestion across regenerations), `responded_by`,
  `responded_at`, `dismiss_reason_code`, `dismiss_reason_text`.
- New append-only `suggestion_events` table: who, what, when, from and to
  status, reason, content version. No update or delete rights.
- `submissions`: add a snapshot of the mode at submit time, open counts by
  severity, unresolved IDs and any override reason.
- `workspace_settings`: `gate_mode`, `block_severity_threshold`,
  `require_dismiss_reason`, `ai_unavailable_behavior`.
- Migration: never backfill fake responses. Existing drafts start as
  "open"; already-submitted content is marked "not tracked".
- Bonus: "dismissed as incorrect", by category and model version, is free
  quality feedback for the AI team.

**API**

- `PATCH /contents/:id/suggestions/:sid` (accept, dismiss, reopen)
- `POST /contents/:id/suggestions/bulk`
- `GET /contents/:id/submission-readiness` → `ready | warn | blocked` with
  the lists
- `POST /contents/:id/submit` (re-checks readiness on the server)
- `GET /contents/:id/suggestion-events` (history)
- `GET/PUT /workspaces/:id/suggestion-policy` (admins only)

Readiness is one pure function, `evaluateSubmissionReadiness(policy,
suggestions, aiStatus)`, used by both endpoints and covered by a
table-driven unit test.

**UI states (no detailed design):** suggestion card states with undo; a
progress line such as "7 of 12 responded, 2 blocking"; reason picker; bulk
select for non-blocking items; the readiness dialog in warn, block and
override variants; "suggestions still generating" and "AI unavailable"
banners; reviewer summary; admin setting. The Submit button stays enabled
and explains itself in the dialog, rather than being disabled without a
reason.

**Rollout and flags**

- Phase 0: analytics events and shadow mode for everyone, for at least two
  weeks of baseline.
- Phase 1: responses, audit log, reviewer summary and **warn** for this
  customer, behind a per-workspace flag.
- Phase 2: **block high-severity** for one or two pilot teams for 4–6 weeks.
  Carry-over (AC 8) must ship first.
- Phase 3: general availability as an admin setting; the default stays
  **off**. Turning the flag off reverts to "off" instantly; logging
  continues.

**Success metrics** (targets to agree with the customer)

- Primary: review rounds per approved item for pilot teams vs before and vs
  other teams.
- Secondary: share of submissions with no open high-severity suggestions.
- Guardrails: time from first suggestion to submit, abandoned submissions,
  and a rubber-stamp signal (dismissals within a few seconds of viewing).

**Open questions (owner)**

- **OQ1** Is there a regulatory need behind the audit trail (retention,
  export)? _CS with the customer._ Only blocks export.
- **OQ2** Reasons for every dismissal, or only for blocking ones? _PM with
  the customer._
- **OQ3** Do suggestions have a severity? If not, who maps categories to
  severity? _AI team._ **Blocks the severity mode.**
- **OQ4** Can a suggestion be matched across regenerations? _AI team and
  engineering, needs a spike._ **Blocks Phase 2.**
- **OQ5** Allow or block submission when the AI is unavailable? _The
  customer._
- **OQ6** Should API and integration submissions be checked? _PM._

**Assumptions**

- **A1** Suggestions are stored on the server with IDs, per content version.
- **A2** There is one server-side submit path where the check can live.
- **A3** "Responded" means considered, not agreed with: a dismissal counts.
- **A4** Simply viewing a suggestion is not a response (too weak for an
  audit).
- **A5** Every other workspace stays on "off".
- **A6** Typical content has fewer than about 30 suggestions (checked by
  H4).

**Dependencies:** AI team (severity, category, model version, fingerprint);
design (dialog and card states, in parallel); data team (events and a
baseline dashboard before Phase 1); security/legal (append-only storage,
retention, GDPR); roles system (new override permission); CS (pilot teams
and customer communication).

**Rough estimate** (illustrative, without knowing the real codebase): about
22–27 engineering days, roughly 3 weeks for one backend and one frontend
engineer plus QA, with design in parallel. Phase 1 is about 60% of that.
The biggest risks to the estimate are OQ3 and OQ4, so I'd start with a
1–2 day spike on both.
