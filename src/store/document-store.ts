"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { produce } from "immer";
import {
  createDefaultDocumentTypes,
  createDefaultWorkflow,
  COMPLIANCE_REFERENCES,
} from "@/lib/defaults";
import type {
  AuditLogEntry,
  DocumentRecord,
  DocumentType,
  DocumentMetadata,
  DocumentSecurity,
  DocumentVersion,
  DocumentCategory,
  ElectronicSignature,
  Role,
  WorkflowInstance,
  WorkflowInstanceStep,
  WorkflowTemplate,
} from "@/types";

type RiskClassification = "Low" | "Medium" | "High";

export interface CreateDocumentInput {
  title: string;
  documentNumber: string;
  version: string;
  documentTypeId: string;
  category: DocumentCategory;
  security: DocumentSecurity;
  createdById: string;
  issuedById: string;
  issuerRole: Role;
  dateCreated: string;
  dateOfIssue: string;
  effectiveFrom: string;
  nextIssueDate: string;
  summary: string;
  tags: string[];
  changeControlId?: string;
  riskClassification: RiskClassification;
  workflowTemplateId?: string;
}

export interface UpdateDocumentInput {
  id: string;
  updates: Partial<
    Pick<
      DocumentRecord,
      | "title"
      | "documentNumber"
      | "metadata"
      | "tags"
      | "attachments"
      | "documentTypeId"
      | "riskClassification"
    >
  >;
  actorId: string;
}

export interface AddVersionInput {
  documentId: string;
  versionLabel: string;
  summary: string;
  actorId: string;
}

export interface WorkflowActionInput {
  documentId: string;
  actorId: string;
  actorRole: Role;
  notes?: string;
  reason: string;
  signatureMeaning: string;
  signatureEvidence: string;
}

export interface CreateWorkflowInput {
  name: string;
  description: string;
  steps: Array<{
    label: string;
    description: string;
    role: Role;
    slaHours: number;
    requiresSignature: boolean;
    signatureMeaning?: string;
  }>;
  complianceScope: string[];
  isDefault?: boolean;
  actorId: string;
}

export interface UpdateWorkflowInput {
  id: string;
  actorId: string;
  updates: Partial<Pick<WorkflowTemplate, "name" | "description" | "complianceScope" | "isDefault">>;
}

interface DocumentState {
  documentTypes: DocumentType[];
  documents: DocumentRecord[];
  workflows: WorkflowTemplate[];
  auditTrail: AuditLogEntry[];
  signatures: ElectronicSignature[];
  bootstrapped: boolean;
  bootstrap: () => void;
  addDocumentType: (
    input: Pick<DocumentType, "type" | "description">,
    actorId: string,
  ) => DocumentType;
  updateDocumentType: (
    id: string,
    updates: Partial<Pick<DocumentType, "description" | "obsolete">>,
    actorId: string,
  ) => void;
  createDocument: (input: CreateDocumentInput) => DocumentRecord;
  updateDocument: (input: UpdateDocumentInput) => void;
  addVersion: (input: AddVersionInput) => void;
  advanceWorkflow: (input: WorkflowActionInput) => void;
  rejectWorkflow: (
    documentId: string,
    actorId: string,
    actorRole: Role,
    reason: string,
  ) => void;
  markEffective: (documentId: string, actorId: string) => void;
  archiveDocument: (documentId: string, actorId: string) => void;
  createWorkflow: (input: CreateWorkflowInput) => WorkflowTemplate;
  updateWorkflow: (input: UpdateWorkflowInput) => void;
}

const SYSTEM_USER_ID = "system";

const buildWorkflowInstance = (workflow: WorkflowTemplate): WorkflowInstance => {
  const now = new Date().toISOString();
  const steps: WorkflowInstanceStep[] = workflow.steps.map(
    (step, index) => ({
      stepId: step.id,
      status: index === 0 ? "In Progress" : "Pending",
      startedAt: index === 0 ? now : undefined,
    }),
  );

  return {
    templateId: workflow.id,
    status: "Draft",
    currentStepIndex: 0,
    steps,
    initiatedAt: now,
  };
};

const toMetadata = (input: CreateDocumentInput): DocumentMetadata => ({
  createdById: input.createdById,
  dateCreated: input.dateCreated,
  dateOfIssue: input.dateOfIssue,
  issuedById: input.issuedById,
  issuerRole: input.issuerRole,
  effectiveFrom: input.effectiveFrom,
  nextIssueDate: input.nextIssueDate,
  category: input.category,
  security: input.security,
  changeControlId: input.changeControlId,
});

const buildVersion = (
  label: string,
  summary: string,
  actorId: string,
): DocumentVersion => ({
  id: crypto.randomUUID(),
  versionLabel: label,
  createdAt: new Date().toISOString(),
  createdById: actorId,
  summary,
});

const recordAudit = (
  state: DocumentState,
  entry: Omit<AuditLogEntry, "id" | "timestamp" | "complianceRefs"> & {
    complianceRefs?: string[];
  },
) => {
  state.auditTrail.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    complianceRefs: entry.complianceRefs ?? [...COMPLIANCE_REFERENCES],
    ...entry,
  });
};

const upsertSignature = (
  state: DocumentState,
  signature: Omit<ElectronicSignature, "id" | "signedAt">,
) => {
  const newSignature: ElectronicSignature = {
    ...signature,
    id: crypto.randomUUID(),
    signedAt: new Date().toISOString(),
  };
  state.signatures.unshift(newSignature);
  return newSignature;
};

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      documentTypes: [],
      documents: [],
      workflows: [],
      auditTrail: [],
      signatures: [],
      bootstrapped: false,
      bootstrap: () => {
        const state = get();
        if (state.bootstrapped) {
          return;
        }

        const defaultTypes = createDefaultDocumentTypes(SYSTEM_USER_ID);
        const defaultWorkflow = createDefaultWorkflow(SYSTEM_USER_ID);
        set(
          produce<DocumentState>((draft) => {
            draft.documentTypes = defaultTypes;
            draft.workflows = [defaultWorkflow];
            draft.bootstrapped = true;
            recordAudit(draft, {
              actorUserId: SYSTEM_USER_ID,
              action: "SYSTEM_BOOTSTRAP",
              entityType: "System",
              entityId: SYSTEM_USER_ID,
              summary:
                "Initialized default workflows and document types for compliance baseline.",
              metadata: {
                defaultTypes: defaultTypes.length,
                workflow: defaultWorkflow.name,
              },
            });
          }),
        );
      },
      addDocumentType: (input, actorId) => {
        let newType: DocumentType | null = null;
        set(
          produce<DocumentState>((draft) => {
            const exists = draft.documentTypes.some(
              (type) => type.type === input.type,
            );
            if (exists) {
              throw new Error("Document type already exists.");
            }
            newType = {
              id: crypto.randomUUID(),
              type: input.type,
              description: input.description,
              obsolete: false,
              createdAt: new Date().toISOString(),
              createdById: actorId,
            };
            draft.documentTypes.unshift(newType);
            recordAudit(draft, {
              actorUserId: actorId,
              action: "DOCUMENT_TYPE_CREATED",
              entityType: "DocumentType",
              entityId: newType.id,
              summary: `Created document type ${newType.type}`,
              metadata: {
                description: newType.description,
              },
            });
          }),
        );
        if (!newType) {
          throw new Error("Unable to create document type.");
        }
        return newType;
      },
      updateDocumentType: (id, updates, actorId) => {
        set(
          produce<DocumentState>((draft) => {
            const index = draft.documentTypes.findIndex(
              (type) => type.id === id,
            );
            if (index === -1) {
              throw new Error("Document type not found.");
            }
            draft.documentTypes[index] = {
              ...draft.documentTypes[index],
              ...updates,
            };
            recordAudit(draft, {
              actorUserId: actorId,
              action: "DOCUMENT_TYPE_UPDATED",
              entityType: "DocumentType",
              entityId: id,
              summary: `Updated document type details`,
              metadata: updates,
            });
          }),
        );
      },
      createDocument: (input) => {
        const state = get();
        const workflow =
          state.workflows.find(
            (candidate) => candidate.id === input.workflowTemplateId,
          ) ??
          state.workflows.find((candidate) => candidate.isDefault) ??
          state.workflows[0];

        if (!workflow) {
          throw new Error("No workflow template available.");
        }

        const version = buildVersion(
          input.version,
          input.summary,
          input.createdById,
        );

        let document: DocumentRecord | null = null;
        set(
          produce<DocumentState>((draft) => {
            document = {
              id: crypto.randomUUID(),
              title: input.title,
              documentNumber: input.documentNumber,
              currentVersion: input.version,
              documentTypeId: input.documentTypeId,
              metadata: toMetadata(input),
              workflow: buildWorkflowInstance(workflow),
              versionHistory: [version],
              tags: input.tags,
              attachments: [],
              riskClassification: input.riskClassification,
              lastUpdatedAt: new Date().toISOString(),
            };

            draft.documents.unshift(document);
            recordAudit(draft, {
              actorUserId: input.createdById,
              action: "DOCUMENT_CREATED",
              entityType: "Document",
              entityId: document.id,
              summary: `Created document ${document.title} v${document.currentVersion}`,
              metadata: {
                documentNumber: document.documentNumber,
                security: document.metadata.security,
                workflow: workflow.name,
              },
            });
          }),
        );

        if (!document) {
          throw new Error("Unable to create document.");
        }
        return document;
      },
      updateDocument: (input) => {
        set(
          produce<DocumentState>((draft) => {
            const docIndex = draft.documents.findIndex(
              (doc) => doc.id === input.id,
            );
            if (docIndex === -1) {
              throw new Error("Document not found.");
            }
            const target = draft.documents[docIndex];
            draft.documents[docIndex] = {
              ...target,
              ...input.updates,
              metadata: {
                ...target.metadata,
                ...(input.updates.metadata ?? {}),
              },
              lastUpdatedAt: new Date().toISOString(),
            };
            recordAudit(draft, {
              actorUserId: input.actorId,
              action: "DOCUMENT_UPDATED",
              entityType: "Document",
              entityId: input.id,
              summary: `Metadata updated for ${target.title}`,
              metadata: input.updates,
            });
          }),
        );
      },
      addVersion: (input) => {
        set(
          produce<DocumentState>((draft) => {
            const doc = draft.documents.find(
              (candidate) => candidate.id === input.documentId,
            );
            if (!doc) {
              throw new Error("Document not found.");
            }
            const newVersion = buildVersion(
              input.versionLabel,
              input.summary,
              input.actorId,
            );
            doc.versionHistory[0].supersededAt ??= new Date().toISOString();
            doc.versionHistory.unshift(newVersion);
            doc.currentVersion = input.versionLabel;
            doc.lastUpdatedAt = new Date().toISOString();
            recordAudit(draft, {
              actorUserId: input.actorId,
              action: "DOCUMENT_VERSIONED",
              entityType: "Document",
              entityId: doc.id,
              summary: `New version ${input.versionLabel} created`,
              metadata: {
                summary: input.summary,
                totalVersions: doc.versionHistory.length,
              },
            });
          }),
        );
      },
      advanceWorkflow: (input) => {
        set(
          produce<DocumentState>((draft) => {
            const doc = draft.documents.find(
              (candidate) => candidate.id === input.documentId,
            );
            if (!doc) {
              throw new Error("Document not found.");
            }

            const template = draft.workflows.find(
              (wf) => wf.id === doc.workflow.templateId,
            );
            if (!template) {
              throw new Error("Workflow template missing.");
            }

            const currentStep = doc.workflow.steps[doc.workflow.currentStepIndex];
            const stepDefinition = template.steps[doc.workflow.currentStepIndex];
            if (!currentStep || !stepDefinition) {
              throw new Error("Workflow is already complete.");
            }

            if (stepDefinition.role !== input.actorRole) {
              throw new Error(
                `This workflow step requires ${stepDefinition.role} role.`,
              );
            }

            const signature = upsertSignature(draft, {
              userId: input.actorId,
              documentId: doc.id,
              workflowStepId: currentStep.stepId,
              meaning: input.signatureMeaning,
              reason: input.reason,
              evidence: input.signatureEvidence,
            });

            currentStep.status = "Completed";
            currentStep.completedAt = new Date().toISOString();
            currentStep.actorUserId = input.actorId;
            currentStep.signatureId = signature.id;
            currentStep.notes = input.notes;

            const nextIndex = doc.workflow.currentStepIndex + 1;
            if (nextIndex >= doc.workflow.steps.length) {
              doc.workflow.status = "Approved";
              doc.workflow.currentStepIndex = nextIndex;
            } else {
              doc.workflow.currentStepIndex = nextIndex;
              const nextStep = doc.workflow.steps[nextIndex];
              nextStep.status = "In Progress";
              doc.workflow.status = "In Review";
            }

            doc.lastUpdatedAt = new Date().toISOString();

            let summary = `${stepDefinition.label} signed off`;
            if (doc.workflow.status === "Approved") {
              summary = `Workflow completed and document approved`;
            }

            recordAudit(draft, {
              actorUserId: input.actorId,
              action: "WORKFLOW_ADVANCED",
              entityType: "Document",
              entityId: doc.id,
              summary,
              metadata: {
                step: stepDefinition.label,
                status: doc.workflow.status,
                signatureId: signature.id,
                evidence: input.signatureEvidence,
              },
            });
          }),
        );
      },
      rejectWorkflow: (documentId, actorId, actorRole, reason) => {
        set(
          produce<DocumentState>((draft) => {
            const doc = draft.documents.find(
              (candidate) => candidate.id === documentId,
            );
            if (!doc) {
              throw new Error("Document not found.");
            }
            const template = draft.workflows.find(
              (wf) => wf.id === doc.workflow.templateId,
            );
            if (!template) {
              throw new Error("Workflow template missing.");
            }

            const index = doc.workflow.currentStepIndex;
            const stepDefinition = template.steps[index];
            if (!stepDefinition) {
              throw new Error("Workflow step not available.");
            }

            if (stepDefinition.role !== actorRole) {
              throw new Error("Insufficient privileges to reject this step.");
            }

            const currentStep = doc.workflow.steps[index];
            currentStep.status = "Rejected";
            currentStep.completedAt = new Date().toISOString();
            currentStep.actorUserId = actorId;
            currentStep.notes = reason;

            doc.workflow.status = "Draft";
            doc.workflow.currentStepIndex = 0;
            doc.workflow.steps = doc.workflow.steps.map((step, idx) => ({
              ...step,
              status: idx === 0 ? "In Progress" : "Pending",
              startedAt: idx === 0 ? new Date().toISOString() : undefined,
              completedAt: undefined,
              actorUserId: undefined,
              signatureId: undefined,
            }));
            doc.lastUpdatedAt = new Date().toISOString();

            recordAudit(draft, {
              actorUserId: actorId,
              action: "WORKFLOW_REJECTED",
              entityType: "Document",
              entityId: doc.id,
              summary: `Workflow rejected at step ${stepDefinition.label}`,
              metadata: {
                reason,
                resetTo: "Draft",
              },
            });
          }),
        );
      },
      markEffective: (documentId, actorId) => {
        set(
          produce<DocumentState>((draft) => {
            const doc = draft.documents.find(
              (candidate) => candidate.id === documentId,
            );
            if (!doc) {
              throw new Error("Document not found.");
            }
            doc.workflow.status = "Effective";
            doc.lastUpdatedAt = new Date().toISOString();
            recordAudit(draft, {
              actorUserId: actorId,
              action: "DOCUMENT_EFFECTIVE",
              entityType: "Document",
              entityId: doc.id,
              summary: `Document released to effective state`,
            });
          }),
        );
      },
      archiveDocument: (documentId, actorId) => {
        set(
          produce<DocumentState>((draft) => {
            const doc = draft.documents.find(
              (candidate) => candidate.id === documentId,
            );
            if (!doc) {
              throw new Error("Document not found.");
            }

            doc.workflow.status = "Archived";
            doc.lastUpdatedAt = new Date().toISOString();
            recordAudit(draft, {
              actorUserId: actorId,
              action: "DOCUMENT_ARCHIVED",
              entityType: "Document",
              entityId: doc.id,
              summary: `Document archived and removed from active distribution`,
            });
          }),
        );
      },
      createWorkflow: (input) => {
        let createdWorkflow: WorkflowTemplate | null = null;
        set(
          produce<DocumentState>((draft) => {
            const workflow: WorkflowTemplate = {
              id: crypto.randomUUID(),
              name: input.name,
              description: input.description,
              steps: input.steps.map((step) => ({
                id: crypto.randomUUID(),
                label: step.label,
                description: step.description,
                role: step.role,
                slaHours: step.slaHours,
                requiresSignature: step.requiresSignature,
                signatureMeaning:
                  step.signatureMeaning ??
                  `${step.label} electronically approved`,
              })),
              complianceScope: input.complianceScope,
              isDefault: Boolean(input.isDefault),
              createdAt: new Date().toISOString(),
              createdById: input.actorId,
            };
            if (workflow.isDefault) {
              draft.workflows = draft.workflows.map((existing) => ({
                ...existing,
                isDefault: false,
              }));
            }
            draft.workflows.unshift(workflow);
            createdWorkflow = workflow;
            recordAudit(draft, {
              actorUserId: input.actorId,
              action: "WORKFLOW_CREATED",
              entityType: "Workflow",
              entityId: workflow.id,
              summary: `Workflow "${workflow.name}" established`,
              metadata: {
                steps: workflow.steps.length,
                default: workflow.isDefault,
              },
            });
          }),
        );
        if (!createdWorkflow) {
          throw new Error("Unable to create workflow.");
        }
        return createdWorkflow;
      },
      updateWorkflow: (input) => {
        set(
          produce<DocumentState>((draft) => {
            const index = draft.workflows.findIndex(
              (workflow) => workflow.id === input.id,
            );
            if (index === -1) {
              throw new Error("Workflow not found.");
            }
            const workflow = draft.workflows[index];
            const updatedWorkflow = {
              ...workflow,
              ...input.updates,
            };
            if (input.updates.isDefault) {
              draft.workflows = draft.workflows.map((existing) =>
                existing.id === input.id
                  ? { ...updatedWorkflow, isDefault: true }
                  : { ...existing, isDefault: false },
              );
            } else {
              draft.workflows[index] = updatedWorkflow;
            }
            recordAudit(draft, {
              actorUserId: input.actorId,
              action: "WORKFLOW_UPDATED",
              entityType: "Workflow",
              entityId: input.id,
              summary: `Workflow "${workflow.name}" updated`,
              metadata: input.updates,
            });
          }),
        );
      },
    }),
    {
      name: "document-management-records",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        documentTypes: state.documentTypes,
        documents: state.documents,
        workflows: state.workflows,
        auditTrail: state.auditTrail,
        signatures: state.signatures,
        bootstrapped: state.bootstrapped,
      }),
      version: 1,
      skipHydration: true,
    },
  ),
);
