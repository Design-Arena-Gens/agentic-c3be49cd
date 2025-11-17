## DocumentManagement — Pharmaceutical DMS

DocumentManagement is a 21 CFR Part 11-aligned document management system built with Next.js. It is tailored for pharmaceutical organizations that must enforce electronic signatures, tamper-evident audit trails, and GxP-compliant workflows across the entire document lifecycle.

### ✨ Core Capabilities
- **Electronic signatures** with password reconfirmation, justification capture, and immutable evidence trails.
- **Automated workflows** supporting configurable multi-role steps, SLA tracking, and signature meanings.
- **Lifecycle governance** for controlled document creation, versioning, issuance, and archival.
- **Role-based access control** with an admin console to provision users, roles, and signature statements.
- **Compliance-ready audit trail** mapped to 21 CFR Part 11, ISO 9001, ICH Q7, GMP Annex 11, and GAMP 5.
- **Document taxonomy management** for controlled types, security classifications, and risk tiers.

### 🏁 Quick Start
```bash
npm install
npm run dev
```
Open `http://localhost:3000` and authenticate with a seeded account:

| Role     | Email                                | Password     |
|----------|--------------------------------------|--------------|
| Admin    | admin@documentmanagement.pharma      | Admin@123    |
| QA       | qa@documentmanagement.pharma         | QA@12345     |
| Author   | author@documentmanagement.pharma     | Author@123   |
| Reviewer | reviewer@documentmanagement.pharma   | Reviewer@123 |

### 🔐 Compliance Highlights
- Password re-entry enforced for every approval signature.
- Audit events include timestamp, actor, entity, metadata, and regulatory references.
- Workflow steps mandate role alignment, SLA targets, and optional rejection with rationale.
- Document lifecycle states (Draft, In Review, Approved, Effective, Archived) captured with change control IDs and security classifications.

### 🛠️ Technology Stack
- **Next.js 16 (App Router)** with React Server Components.
- **Tailwind CSS** for regulated UI styling.
- **Zustand (persist middleware)** for client-secure state and localStorage retention.
- **React Hook Form + Zod** for schema-driven validation.
- **Headless UI & Heroicons** for accessible modals and iconography.
- **date-fns** for timezone-safe scheduling logic.

### ✅ Production Build
```bash
npm run build
npm run start
```

### 📂 Project Structure Highlights
- `src/app/login` — secure authentication screen with compliance context.
- `src/app/(dashboard)/app` — protected workspace with dashboards, documents, workflows, audit log, and user admin.
- `src/store` — persisted auth/document stores enforcing signature and audit logic.
- `src/types` — typed domain model for documents, workflows, signatures, and users.

### 🚀 Deployment
The project is optimized for Vercel. After building locally, deploy with:
```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-c3be49cd
```
Once live, verify the production release:
```bash
curl https://agentic-c3be49cd.vercel.app
```

---
DocumentManagement delivers inspection-ready traceability for regulated teams while remaining fully deployable on modern cloud infrastructure. Adjust seed data, workflows, or access policies within the stores to tailor the implementation to your organization.
