---
name: plan-to-issues
description: Split this repo's plan.md into GitHub issues with gh, one per unit of work, after a human has reviewed the split. Use when a plan is ready and has no issues yet.
---

# plan-to-issues

Turns `plan.md` into GitHub issues that workers can pick up cold. Easiest with `gh`, authenticated,
in a shell this agent can run.

## Steps

1. Read `plan.md`, `AGENTS.md` and `docs/adr/`.
2. Draft the split as a table: title · plan section · scope · done when · blocked by.
   One issue per unit of work.
3. **Stop and show the table to the human.** Publish nothing until they approve it.
4. Every issue carries the shape below. Ask the human only about anything it doesn't cover.
5. Create the plan's label if it's missing, then each issue in dependency order, so blocked-by
   can cite real numbers:

   ```sh
   gh label create "plan:<plan>"
   gh issue create --title "<title>" --label "plan:<plan>" --body-file <tmp.md>
   ```

6. Record every issue URL from gh's output (not from memory) and reply with the list.

Closing one, with the closing comment from AGENTS.md:

```sh
gh issue close <n> -c "<closing comment>"
```

If a pushed `closes #n` already closed it, `gh issue close` posts nothing: use
`gh issue comment <n> --body "<closing comment>"`.

## What every issue carries

Agreed with the lane's owner on 2026-10-29 (plan morning-digest). The reviewer sorts by the first
line and the label.

- First line: `Source: plan.md § <n>`, with the subsection where the plan has one (`§ 2a`).
- Label: `plan:<plan>`, the `plan:` value from the plan's frontmatter (`plan:morning-digest`).
- `## Scope`: the boundary and the starting point, one line each. Not the edit list.
- `## Done when`: the plan's check, word for word where it has one. If it waits on a person
  (a reviewer), say so: the issue stays open until they have acted (AGENTS.md, rule 5).
- `## Blocked by`: issue numbers, or `—`. Say when an issue can start before its blocker lands
  but can't finish.
- `## Worker`: the suggested model and why (AGENTS.md, step 3), and a reminder to close with the
  closing comment from AGENTS.md.

## No `gh`

Steps 1–4 hold either way. GitHub reachable another way (a connector, the REST API, the web UI):
the same issues, made that way. GitHub issues out of reach altogether: write them as files in
`docs/issues/`, format in ADR 0004, then commit and push.

## Don'ts

- Don't paste the whole plan into one issue, and don't keep issues only in chat.
- Don't invent sections the plan doesn't have. If the plan is unclear, ask.
