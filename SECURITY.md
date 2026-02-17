# Security Policy

## Supported Versions

We only provide security fixes for the latest minor release on `main`.

## Reporting a Vulnerability

- Do not create public issues for security vulnerabilities.
- Email: security@smartpastehub.dev
- Include reproduction steps, impact, and affected version/commit.

We will:

1. Acknowledge receipt within 72 hours.
2. Triage severity and impact.
3. Provide timeline updates until remediation.
4. Publish a security advisory after patch release.

## Security Development Rules

- Never commit secrets (`.env`, private keys, tokens).
- Validate and sanitize IPC inputs.
- Keep dependencies updated and scanned.
- Use least-privilege principles for desktop integrations.
- Redact sensitive data from logs.
