const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const { execSync } = require('child_process');

const REVIEW_PROMPT = `You are a senior engineer reviewing a pull request for VelocityHub CRM — a Node.js/Express backend with React frontend.

## Your focus (in priority order)
1. **Critical blockers** — SQL injection vectors, unparameterized queries, exposed secrets, broken auth checks, unsafe data deletion without guards, payment logic errors
2. **Business logic errors** — incorrect conditional branches, missing validation on user-facing inputs, data that could silently corrupt or be lost
3. **Unhandled edge cases** — null/undefined dereferences, missing error handling on async DB calls, race conditions
4. **N+1 query problems** — loops that hit the database, missing eager-loads
5. **Anything touching payments or data deletions** — flag every code path that deletes records or processes money, even if it looks correct

## Explicitly ignore
- Formatting, indentation, whitespace
- Naming style preferences (camelCase vs snake_case etc.)
- Comment presence or absence
- Import ordering
- Code style that does not affect correctness or security

## Output format
Return a JSON object with this exact shape:
{
  "summary": "One paragraph overall assessment",
  "blocking": [
    {
      "file": "path/to/file.js",
      "line": 42,
      "severity": "CRITICAL",
      "title": "Short title",
      "body": "Detailed explanation of why this is a problem and how to fix it"
    }
  ],
  "warnings": [
    {
      "file": "path/to/file.js",
      "line": 17,
      "severity": "WARNING",
      "title": "Short title",
      "body": "Detailed explanation"
    }
  ]
}

Only include items with a clear file + line reference. If you cannot pinpoint a line, include it in the summary instead.
Return ONLY the JSON object — no markdown fences, no preamble.`;

async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const diff = fs.readFileSync('pr.diff', 'utf8');
  const prTitle = process.env.PR_TITLE || '';
  const prBody = process.env.PR_BODY || '';

  // Truncate diff if it exceeds ~150k chars to stay within token limits
  const truncated = diff.length > 150000;
  const diffContent = truncated ? diff.slice(0, 150000) + '\n\n[diff truncated — remaining files not reviewed]' : diff;

  const userMessage = `PR Title: ${prTitle}
PR Description: ${prBody || '(none)'}

Diff:
${diffContent}`;

  let parsed;
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: userMessage }],
      system: REVIEW_PROMPT,
    });

    const raw = message.content[0].text.trim();
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error('AI review failed:', err.message);
    // Don't block the PR if the review itself errors
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'result=error\n');
    process.exit(0);
  }

  const prNumber = process.env.PR_NUMBER;
  const repo = process.env.REPO;
  const token = process.env.GH_TOKEN;

  // Post inline comments for every finding
  const allFindings = [...(parsed.blocking || []), ...(parsed.warnings || [])];
  for (const finding of allFindings) {
    if (!finding.file || !finding.line) continue;
    const severityLabel = finding.severity === 'CRITICAL' ? '🚨 **CRITICAL**' : '⚠️ **WARNING**';
    const body = `${severityLabel}: **${finding.title}**\n\n${finding.body}`;

    try {
      const diffPayload = JSON.stringify({
        body,
        path: finding.file,
        line: finding.line,
        side: 'RIGHT',
        commit_id: process.env.SHA || '',
      });

      // Use gh CLI to post review comment
      execSync(
        `gh api --method POST /repos/${repo}/pulls/${prNumber}/comments ` +
          `-H "Accept: application/vnd.github+json" ` +
          `--input -`,
        {
          input: diffPayload,
          env: { ...process.env, GH_TOKEN: token },
        }
      );
    } catch {
      // Inline comment failed (e.g. line not in diff) — skip silently
    }
  }

  // Post a top-level summary comment
  const criticalCount = (parsed.blocking || []).length;
  const warningCount = (parsed.warnings || []).length;

  let summaryHeader;
  if (criticalCount > 0) {
    summaryHeader = `## 🚨 AI Review — ${criticalCount} critical issue${criticalCount !== 1 ? 's' : ''} found (merge blocked)\n`;
  } else if (warningCount > 0) {
    summaryHeader = `## ⚠️ AI Review — passed with ${warningCount} warning${warningCount !== 1 ? 's' : ''}\n`;
  } else {
    summaryHeader = `## ✅ AI Review — no issues found\n`;
  }

  let summaryBody = `${summaryHeader}\n${parsed.summary || ''}\n`;
  if (truncated) {
    summaryBody += '\n> ⚠️ Diff was truncated — only the first ~150 KB was reviewed.\n';
  }

  execSync(
    `gh pr comment ${prNumber} --repo ${repo} --body-file -`,
    {
      input: summaryBody,
      env: { ...process.env, GH_TOKEN: token },
    }
  );

  // Set output for the status step
  let result = 'passed';
  if (criticalCount > 0) result = 'blocked';
  else if (warningCount > 0) result = 'warned';

  fs.appendFileSync(process.env.GITHUB_OUTPUT, `result=${result}\n`);
  console.log(`Review complete — ${criticalCount} critical, ${warningCount} warnings`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
