# Security Policy

Thank you for helping keep **Aconcagua: Stone Sentinel** secure.

## Supported scope

Security reports are accepted for:

- Runtime code in `prototype/web-v1/`
- API endpoint code in `api/`
- Tooling/scripts that process external input (`scripts/`, data loaders, validators)
- Deployment/runtime configuration in `.github/workflows/` and `vercel.json`

Out of scope for security response SLAs:

- Narrative/content issues without security impact
- Visual/layout-only defects
- Feature requests

## Reporting a vulnerability

Please report vulnerabilities **privately** by email:

- **aconcaguastonesentinel@gmail.com**
- Subject: `SECURITY REPORT — <short title>`

Include:

1. Affected file(s)/module(s)
2. Reproduction steps and prerequisites
3. Impact assessment (confidentiality/integrity/availability)
4. Suggested mitigation (if available)

Please do **not** open a public issue for unpatched vulnerabilities.

## Response targets

- Initial acknowledgment: within **5 business days**
- Triage decision: within **10 business days**
- Patch timeline: depends on severity and exploitability

## Disclosure policy

- Coordinated disclosure is preferred.
- Public disclosure is requested only after a fix or mitigation is available.
- Credit can be provided in release notes on request.

## Security maintenance notes

- Keep dependency and workflow updates in regular maintenance PRs.
- Security-impacting changes must be called out in `CHANGELOG.md` under `### Security`.
