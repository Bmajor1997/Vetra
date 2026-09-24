# Votic Mobile Dependency Security Report

This file is maintained automatically by GitHub Actions.

It tracks third-party mobile dependency vulnerabilities separately from security findings in Votic source code.

## Policy

- Semgrep scans Votic React Native/TypeScript source code.
- Gitleaks scans the repository for exposed secrets.
- npm audit checks third-party dependencies.
- High and critical dependency vulnerabilities fail CI.
- Low and moderate dependency vulnerabilities are recorded here for review.
- Do not use `npm audit fix --force` automatically. Breaking framework changes must be reviewed.

## Current report

The next Security Report workflow run will replace this section with the current npm audit results and remediation guidance.
