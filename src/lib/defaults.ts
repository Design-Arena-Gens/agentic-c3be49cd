"use client";

import {
  DocumentType,
  DOCUMENT_TYPE_OPTIONS,
  Role,
  User,
  WorkflowTemplate,
} from "@/types";

export const DEFAULT_USER_SEED: Omit<User, "id">[] = [
  {
    name: "System Administrator",
    email: "admin@documentmanagement.pharma",
    role: "Admin",
    passwordHash:
      "$2b$10$QjNEipLVi77s34EYAwgCw.SAKpLpEI2vlzfX1FMYRlkT0rG1CkFXq",
    signature: "Admin Signatory",
    lastLoginAt: undefined,
    enabled: true,
  },
  {
    name: "QA Lead",
    email: "qa@documentmanagement.pharma",
    role: "QA",
    passwordHash:
      "$2b$10$5M.WfBMLZBbekbPqD2V2auFxpNcVq/ahsJDKm/nC9DI7yKj0XZvVC",
    signature: "QA Verification",
    lastLoginAt: undefined,
    enabled: true,
  },
  {
    name: "Author",
    email: "author@documentmanagement.pharma",
    role: "Author",
    passwordHash:
      "$2b$10$L1fjHMjPbSdvRyx4vtTBTOhqN23/ra/QvT7zPSii6EhcTGgm/4sxW",
    signature: "Document Author Approval",
    lastLoginAt: undefined,
    enabled: true,
  },
  {
    name: "Independent Reviewer",
    email: "reviewer@documentmanagement.pharma",
    role: "Reviewer",
    passwordHash:
      "$2b$10$CONqvkWsMO.weNHwFpsPy.PyrAKaPlMrfB0iyCgnN/.W.MNofXdma",
    signature: "Reviewer Verification",
    lastLoginAt: undefined,
    enabled: true,
  },
];

export const COMPLIANCE_REFERENCES = [
  "21 CFR Part 11",
  "ICH Q7",
  "GMP Annex 11",
  "ISO 9001:2015",
  "GAMP 5",
] as const;

export const createDefaultDocumentTypes = (
  creatorId: string,
): DocumentType[] => {
  const timestamp = new Date().toISOString();

  return DOCUMENT_TYPE_OPTIONS.map((label) => ({
    id: crypto.randomUUID(),
    type: label,
    description: `${label} controlled document`,
    obsolete: false,
    createdAt: timestamp,
    createdById: creatorId,
  }));
};

const buildWorkflowSteps = (): WorkflowTemplate["steps"] => {
  const steps: { label: string; description: string; role: Role; sla: number; meaning: string }[] =
    [
      {
        label: "Author Draft Review",
        description:
          "Author confirms completeness and accuracy prior to formal review.",
        role: "Author",
        sla: 48,
        meaning: "Draft prepared in accordance with applicable SOPs.",
      },
      {
        label: "Independent Review",
        description:
          "Reviewer validates technical accuracy and regulatory alignment.",
        role: "Reviewer",
        sla: 72,
        meaning:
          "Independent review completed; document complies with applicable standards.",
      },
      {
        label: "Quality Assurance Approval",
        description:
          "QA ensures alignment with quality system and change control traceability.",
        role: "QA",
        sla: 48,
        meaning:
          "QA approval verifying change control, training impact, and compliance.",
      },
      {
        label: "Final Approval",
        description:
          "Approver authorizes release to production environments and workforce.",
        role: "Approver",
        sla: 24,
        meaning: "Final release approval granted; document ready for issuance.",
      },
    ];

  return steps.map((step) => ({
    id: crypto.randomUUID(),
    label: step.label,
    description: step.description,
    role: step.role,
    slaHours: step.sla,
    requiresSignature: true,
    signatureMeaning: step.meaning,
  }));
};

export const createDefaultWorkflow = (creatorId: string): WorkflowTemplate => ({
  id: crypto.randomUUID(),
  name: "Standard GxP Controlled Document Workflow",
  description:
    "Enforces multi-stage authoring, QA, and approval for GMP regulated documentation.",
  steps: buildWorkflowSteps(),
  complianceScope: [...COMPLIANCE_REFERENCES],
  isDefault: true,
  createdAt: new Date().toISOString(),
  createdById: creatorId,
});

export const SUPPORTED_ROLES: Role[] = [
  "Admin",
  "Author",
  "Reviewer",
  "QA",
  "Approver",
  "Viewer",
];
