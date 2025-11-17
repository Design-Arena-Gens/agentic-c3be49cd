export type Role =
  | "Admin"
  | "Author"
  | "Reviewer"
  | "QA"
  | "Approver"
  | "Viewer";

export const ROLE_LABELS: Record<Role, string> = {
  Admin: "System Administrator",
  Author: "Document Author",
  Reviewer: "Independent Reviewer",
  QA: "Quality Assurance",
  Approver: "Final Approver",
  Viewer: "Read Only",
};

export const DOCUMENT_SECURITY_OPTIONS = [
  "Confidential",
  "Internal",
  "Restricted",
  "Public",
] as const;

export type DocumentSecurity =
  (typeof DOCUMENT_SECURITY_OPTIONS)[number];

export type DocumentLifecycleStatus =
  | "Draft"
  | "In Review"
  | "Pending Approval"
  | "QA Verification"
  | "Approved"
  | "Effective"
  | "Superseded"
  | "Archived";

export const DOCUMENT_CATEGORIES = [
  "Quality Management",
  "Manufacturing",
  "Regulatory",
  "Laboratory",
  "Safety",
  "Clinical",
  "Supply Chain",
  "Validation",
  "Training",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_TYPE_OPTIONS = [
  "Manual",
  "Procedure",
  "Process",
  "Work Instruction",
  "Policy",
  "Checklist",
  "Format",
  "Template",
  "Masters",
] as const;

export type DocumentTypeOption = (typeof DOCUMENT_TYPE_OPTIONS)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordHash: string;
  signature?: string;
  lastLoginAt?: string;
  enabled: boolean;
}

export interface DocumentType {
  id: string;
  type: DocumentTypeOption;
  description: string;
  obsolete: boolean;
  createdAt: string;
  createdById: string;
}

export interface DocumentMetadata {
  dateCreated: string;
  createdById: string;
  dateOfIssue: string;
  issuedById: string;
  issuerRole: Role;
  effectiveFrom: string;
  nextIssueDate: string;
  category: DocumentCategory;
  security: DocumentSecurity;
  changeControlId?: string;
}

export interface DocumentVersion {
  id: string;
  versionLabel: string;
  createdAt: string;
  createdById: string;
  summary: string;
  supersededAt?: string;
}

export interface WorkflowStep {
  id: string;
  label: string;
  description: string;
  role: Role;
  slaHours: number;
  requiresSignature: boolean;
  signatureMeaning?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  complianceScope: string[];
  isDefault: boolean;
  createdAt: string;
  createdById: string;
}

export type WorkflowStepStatus = "Pending" | "In Progress" | "Completed" | "Rejected";

export interface WorkflowInstanceStep {
  stepId: string;
  status: WorkflowStepStatus;
  startedAt?: string;
  completedAt?: string;
  actorUserId?: string;
  signatureId?: string;
  notes?: string;
}

export interface WorkflowInstance {
  templateId: string;
  status: DocumentLifecycleStatus;
  currentStepIndex: number;
  steps: WorkflowInstanceStep[];
  initiatedAt: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  documentNumber: string;
  currentVersion: string;
  documentTypeId: string;
  metadata: DocumentMetadata;
  workflow: WorkflowInstance;
  versionHistory: DocumentVersion[];
  tags: string[];
  attachments: string[];
  riskClassification: "Low" | "Medium" | "High";
  lastUpdatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorUserId: string;
  action: string;
  entityType: "Document" | "DocumentType" | "Workflow" | "User" | "System";
  entityId: string;
  summary: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  complianceRefs?: string[];
}

export interface ElectronicSignature {
  id: string;
  userId: string;
  documentId: string;
  workflowStepId: string;
  signedAt: string;
  meaning: string;
  reason: string;
  evidence: string;
}
