# Automated Outreach Pipeline

A production-ready Node.js + TypeScript CLI that automates end-to-end B2B cold outreach. Given a single seed domain, this pipeline autonomously discovers lookalike companies, finds decision-makers, resolves verified work emails, and sends highly personalized outreach emails.

##  The Pipeline Flow

The system runs entirely hand-off free in four distinct stages:

1. **Ocean.io (Company Sourcing)**: Takes a seed domain (e.g., `stripe.com`) and queries for lookalike companies with similar firmographics.
2. **Prospeo (Decision Makers)**: Parses the company list and surfaces C-Suite, VP, and Founder-level decision-makers along with their LinkedIn profiles.
3. **Eazyreach (Email Resolution)**: Takes the LinkedIn URLs and resolves them into verified, deliverable work email addresses.
4. **Brevo (Email Dispatch)**: After a manual safety checkpoint, fires personalized outreach emails to the verified contacts.

*Every stage's output feeds the next stage's input automatically. Zero manual hand-offs.*

##  Key Features

- **Resilient Architecture**: Uses a custom `HttpClient` built on top of `p-limit` that handles concurrency, HTTP `retry-after` headers, and exponential backoff.
- **Fault Tolerant**: Uses `Promise.all` with individual catch blocks. A single API failure (e.g., one unresolvable contact) will be safely logged and omitted without crashing the pipeline.
- **Smart Deduplication**: Native de-duping ensures the same company or executive isn't queried or emailed twice.
- **Safety Checkpoints**: Halts execution before dispatching emails, providing a full summary of companies found, contacts scraped, and emails verified.
- **Type-Safe**: Strictly validated environment variables and API responses using `Zod`.

##  Setup & Installation

### Prerequisites
- Node.js >= 20
- A custom domain authenticated in Brevo (for email deliverability)
- API Keys for Ocean.io, Prospeo, Eazyreach, and Brevo.

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Copy the example environment file:
```bash
cp .env.example .env
```

3. Fill out the `.env` file with your credentials:
```env
OCEAN_API_KEY=your_key
PROSPEO_API_KEY=your_key
EAZYREACH_CLIENT_ID=your_id
EAZYREACH_CLIENT_SECRET=your_secret
BREVO_API_KEY=your_key
BREVO_SENDER_EMAIL=hello@yourdomain.com
BREVO_SENDER_NAME="Your Name"
```

##  Usage

Run the pipeline by passing a single seed domain:

```bash
npm start -- domain=stripe.com
```

The CLI will stream its progress through the 4 stages. Once email resolution is complete, it will present a summary and ask for confirmation `(y/n)` before dispatching the emails via Brevo.

*All results and failures are atomically written to `output/results.json` at the end of the run.*

##  Development & Testing

```bash
# Build the TypeScript project
npm run build

# Run the Vitest test suite
npm test

# Run ESLint
npm run lint
```

##  Email Templates

You can configure the outreach copy in your `.env` file using the following supported variables:
`{{name}}`, `{{firstName}}`, `{{title}}`, `{{company}}`, `{{domain}}`, `{{email}}`

Example:
```env
EMAIL_SUBJECT_TEMPLATE="Quick idea for {{company}}"
EMAIL_BODY_TEMPLATE="Hi {{firstName}},\n\nI noticed your work as {{title}} at {{company}}..."
```
