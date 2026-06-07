# Automated Outreach Pipeline

A Node.js + TypeScript CLI that discovers lookalike companies, finds decision makers, resolves verified work emails, and sends personalized outreach after an explicit safety checkpoint.

## Setup

1. Use Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and fill in all API credentials and a verified Brevo sender.
4. Run `npm start -- domain=stripe.com`.

The pipeline always prompts before sending. Results and failures are written atomically to `output/results.json`, even when sending is declined.

## Commands

```text
npm start -- domain=company.com
npm run build
npm test
npm run lint
```

## Templates

`EMAIL_SUBJECT_TEMPLATE` and `EMAIL_BODY_TEMPLATE` support `{{name}}`, `{{firstName}}`, `{{title}}`, `{{company}}`, `{{domain}}`, and `{{email}}`.
