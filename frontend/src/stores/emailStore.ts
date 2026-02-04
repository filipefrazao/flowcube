/**
 * FlowCube - Email Store
 * Zustand store for Email Sequence Builder state management
 */
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  EmailProvider,
  EmailProviderCreateRequest,
  EmailProviderUpdateRequest,
  EmailTemplate,
  EmailTemplateCreateRequest,
  EmailTemplateUpdateRequest,
  EmailSequence,
  EmailSequenceCreateRequest,
  EmailSequenceUpdateRequest,
  EmailStep,
  EmailStepCreateRequest,
  EmailStepUpdateRequest,
  EmailRecipient,
  EmailRecipientCreateRequest,
  EmailRecipientUpdateRequest,
  RecipientImportResult,
  SequenceEnrollment,
  EmailSend,
  EmailEvent,
  RecipientFilters,
  SendFilters,
  TemplateCategory,
  SequenceStatus,
} from "@/types/email.types";
import { emailApiClient } from "@/lib/api/email";

// ============ State Types ============

interface EmailState {
  // Provider state
  providers: EmailProvider[];
  selectedProviderId: string | null;
  providersLoading: boolean;
  providersError: string | null;

  // Template state
  templates: EmailTemplate[];
  selectedTemplateId: string | null;
  templatesLoading: boolean;
  templatesError: string | null;
  templateFilter: {
    category: TemplateCategory | null;
    search: string;
  };

  // Sequence state
  sequences: EmailSequence[];
  selectedSequenceId: string | null;
  sequencesLoading: boolean;
  sequencesError: string | null;
  sequenceFilter: {
    status: SequenceStatus | null;
  };

  // Step state
  steps: EmailStep[];
  selectedStepId: string | null;
  stepsLoading: boolean;
  stepsError: string | null;

  // Recipient state
  recipients: EmailRecipient[];
  selectedRecipientIds: string[];
  recipientsLoading: boolean;
  recipientsError: string | null;
  recipientFilters: RecipientFilters;
  recipientPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  availableTags: string[];

  // Send state
  sends: EmailSend[];
  sendsLoading: boolean;
  sendsError: string | null;
  sendFilters: SendFilters;
  sendPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  // Events state
  events: EmailEvent[];
  eventsLoading: boolean;

  // Enrollments state
  enrollments: SequenceEnrollment[];
  enrollmentsLoading: boolean;

  // UI state
  showProviderSetup: boolean;
  showTemplateEditor: boolean;
  showSequenceBuilder: boolean;
  showRecipientImport: boolean;
  editorTab: "design" | "html" | "preview";
  isTestingSend: boolean;

  // Actions - Providers
  fetchProviders: () => Promise<void>;
  createProvider: (data: EmailProviderCreateRequest) => Promise<EmailProvider>;
  updateProvider: (
    id: string,
    data: EmailProviderUpdateRequest
  ) => Promise<EmailProvider>;
  deleteProvider: (id: string) => Promise<void>;
  selectProvider: (id: string | null) => void;
  testProviderConnection: (
    id: string
  ) => Promise<{ success: boolean; message: string; response_time_ms: number }>;
  sendTestEmail: (
    id: string,
    toEmail: string
  ) => Promise<{ success: boolean; message_id: string }>;
  setProviderAsDefault: (id: string) => Promise<void>;

  // Actions - Templates
  fetchTemplates: (category?: string, search?: string) => Promise<void>;
  createTemplate: (data: EmailTemplateCreateRequest) => Promise<EmailTemplate>;
  updateTemplate: (
    id: string,
    data: EmailTemplateUpdateRequest
  ) => Promise<EmailTemplate>;
  deleteTemplate: (id: string) => Promise<void>;
  selectTemplate: (id: string | null) => void;
  duplicateTemplate: (id: string, name?: string) => Promise<EmailTemplate>;
  previewTemplate: (
    id: string,
    variables: Record<string, string>
  ) => Promise<{ subject: string; html: string; text: string }>;
  setTemplateFilter: (
    filter: Partial<{ category: TemplateCategory | null; search: string }>
  ) => void;

  // Actions - Sequences
  fetchSequences: (status?: string) => Promise<void>;
  createSequence: (data: EmailSequenceCreateRequest) => Promise<EmailSequence>;
  updateSequence: (
    id: string,
    data: EmailSequenceUpdateRequest
  ) => Promise<EmailSequence>;
  deleteSequence: (id: string) => Promise<void>;
  selectSequence: (id: string | null) => void;
  activateSequence: (id: string) => Promise<EmailSequence>;
  deactivateSequence: (id: string) => Promise<EmailSequence>;
  duplicateSequence: (id: string, name?: string) => Promise<EmailSequence>;
  enrollRecipients: (
    sequenceId: string,
    recipientIds: string[]
  ) => Promise<{ enrolled: number; skipped: number; errors: string[] }>;
  setSequenceFilter: (
    filter: Partial<{ status: SequenceStatus | null }>
  ) => void;

  // Actions - Steps
  fetchSteps: (sequenceId: string) => Promise<void>;
  createStep: (
    sequenceId: string,
    data: Omit<EmailStepCreateRequest, "sequence_id">
  ) => Promise<EmailStep>;
  updateStep: (
    sequenceId: string,
    stepId: string,
    data: EmailStepUpdateRequest
  ) => Promise<EmailStep>;
  deleteStep: (sequenceId: string, stepId: string) => Promise<void>;
  selectStep: (id: string | null) => void;
  reorderSteps: (sequenceId: string, stepIds: string[]) => Promise<void>;
  toggleStepActive: (sequenceId: string, stepId: string) => Promise<void>;

  // Actions - Recipients
  fetchRecipients: (
    filters?: RecipientFilters,
    page?: number,
    pageSize?: number
  ) => Promise<void>;
  createRecipient: (
    data: EmailRecipientCreateRequest
  ) => Promise<EmailRecipient>;
  updateRecipient: (
    id: string,
    data: EmailRecipientUpdateRequest
  ) => Promise<EmailRecipient>;
  deleteRecipient: (id: string) => Promise<void>;
  selectRecipient: (id: string) => void;
  deselectRecipient: (id: string) => void;
  selectAllRecipients: () => void;
  deselectAllRecipients: () => void;
  importRecipientsCsv: (
    file: File,
    fieldMapping: Record<string, string>,
    tags?: string[],
    updateExisting?: boolean
  ) => Promise<RecipientImportResult>;
  exportRecipients: (filters?: RecipientFilters) => Promise<Blob>;
  bulkTagRecipients: (
    recipientIds: string[],
    tags: string[]
  ) => Promise<{ updated: number }>;
  bulkRemoveTagRecipients: (
    recipientIds: string[],
    tags: string[]
  ) => Promise<{ updated: number }>;
  unsubscribeRecipient: (id: string) => Promise<void>;
  resubscribeRecipient: (id: string) => Promise<void>;
  setRecipientFilters: (filters: Partial<RecipientFilters>) => void;
  setRecipientPage: (page: number) => void;
  fetchTags: () => Promise<void>;

  // Actions - Sends
  fetchSends: (
    filters?: SendFilters,
    page?: number,
    pageSize?: number
  ) => Promise<void>;
  resendEmail: (id: string) => Promise<EmailSend>;
  cancelSend: (id: string) => Promise<EmailSend>;
  setSendFilters: (filters: Partial<SendFilters>) => void;
  setSendPage: (page: number) => void;

  // Actions - Events
  fetchEvents: (sendId: string) => Promise<void>;
  fetchRecipientActivity: (recipientId: string) => Promise<void>;

  // Actions - Enrollments
  fetchEnrollments: (sequenceId: string, status?: string) => Promise<void>;
  removeEnrollment: (sequenceId: string, enrollmentId: string) => Promise<void>;

  // Actions - UI
  setShowProviderSetup: (show: boolean) => void;
  setShowTemplateEditor: (show: boolean) => void;
  setShowSequenceBuilder: (show: boolean) => void;
  setShowRecipientImport: (show: boolean) => void;
  setEditorTab: (tab: "design" | "html" | "preview") => void;

  // Actions - Reset
  reset: () => void;
  resetSequence: () => void;
}

// ============ Initial State ============

const initialState = {
  // Provider state
  providers: [] as EmailProvider[],
  selectedProviderId: null as string | null,
  providersLoading: false,
  providersError: null as string | null,

  // Template state
  templates: [] as EmailTemplate[],
  selectedTemplateId: null as string | null,
  templatesLoading: false,
  templatesError: null as string | null,
  templateFilter: {
    category: null as TemplateCategory | null,
    search: "",
  },

  // Sequence state
  sequences: [] as EmailSequence[],
  selectedSequenceId: null as string | null,
  sequencesLoading: false,
  sequencesError: null as string | null,
  sequenceFilter: {
    status: null as SequenceStatus | null,
  },

  // Step state
  steps: [] as EmailStep[],
  selectedStepId: null as string | null,
  stepsLoading: false,
  stepsError: null as string | null,

  // Recipient state
  recipients: [] as EmailRecipient[],
  selectedRecipientIds: [] as string[],
  recipientsLoading: false,
  recipientsError: null as string | null,
  recipientFilters: {} as RecipientFilters,
  recipientPagination: {
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  },
  availableTags: [] as string[],

  // Send state
  sends: [] as EmailSend[],
  sendsLoading: false,
  sendsError: null as string | null,
  sendFilters: {} as SendFilters,
  sendPagination: {
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  },

  // Events state
  events: [] as EmailEvent[],
  eventsLoading: false,

  // Enrollments state
  enrollments: [] as SequenceEnrollment[],
  enrollmentsLoading: false,

  // UI state
  showProviderSetup: false,
  showTemplateEditor: false,
  showSequenceBuilder: false,
  showRecipientImport: false,
  editorTab: "design" as const,
  isTestingSend: false,
};

// ============ Store ============

export const useEmailStore = create<EmailState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // ============ Provider Actions ============

        fetchProviders: async () => {
          set((state) => {
            state.providersLoading = true;
            state.providersError = null;
          });
          try {
            const providers = await emailApiClient.providers.list();
            set((state) => {
              state.providers = providers;
              state.providersLoading = false;
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Failed to fetch providers";
            set((state) => {
              state.providersError = message;
              state.providersLoading = false;
            });
          }
        },

        createProvider: async (data: EmailProviderCreateRequest) => {
          const provider = await emailApiClient.providers.create(data);
          set((state) => {
            state.providers.push(provider);
          });
          return provider;
        },

        updateProvider: async (id: string, data: EmailProviderUpdateRequest) => {
          const provider = await emailApiClient.providers.update(id, data);
          set((state) => {
            const index = state.providers.findIndex((p: EmailProvider) => p.id === id);
            if (index !== -1) state.providers[index] = provider;
          });
          return provider;
        },

        deleteProvider: async (id: string) => {
          await emailApiClient.providers.delete(id);
          set((state) => {
            state.providers = state.providers.filter((p: EmailProvider) => p.id !== id);
            if (state.selectedProviderId === id) state.selectedProviderId = null;
          });
        },

        selectProvider: (id: string | null) => {
          set((state) => {
            state.selectedProviderId = id;
          });
        },

        testProviderConnection: async (id: string) => {
          return await emailApiClient.providers.testConnection(id);
        },

        sendTestEmail: async (id: string, toEmail: string) => {
          set((state) => {
            state.isTestingSend = true;
          });
          try {
            const result = await emailApiClient.providers.sendTest(id, toEmail);
            return result;
          } finally {
            set((state) => {
              state.isTestingSend = false;
            });
          }
        },

        setProviderAsDefault: async (id: string) => {
          const provider = await emailApiClient.providers.setDefault(id);
          set((state) => {
            state.providers = state.providers.map((p: EmailProvider) => ({
              ...p,
              is_default: p.id === id,
            }));
            const index = state.providers.findIndex((p: EmailProvider) => p.id === id);
            if (index !== -1) state.providers[index] = provider;
          });
        },

        // ============ Template Actions ============

        fetchTemplates: async (category?: string, search?: string) => {
          set((state) => {
            state.templatesLoading = true;
            state.templatesError = null;
          });
          try {
            const templates = await emailApiClient.templates.list(category, search);
            set((state) => {
              state.templates = templates;
              state.templatesLoading = false;
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Failed to fetch templates";
            set((state) => {
              state.templatesError = message;
              state.templatesLoading = false;
            });
          }
        },

        createTemplate: async (data: EmailTemplateCreateRequest) => {
          const template = await emailApiClient.templates.create(data);
          set((state) => {
            state.templates.push(template);
          });
          return template;
        },

        updateTemplate: async (id: string, data: EmailTemplateUpdateRequest) => {
          const template = await emailApiClient.templates.update(id, data);
          set((state) => {
            const index = state.templates.findIndex((t: EmailTemplate) => t.id === id);
            if (index !== -1) state.templates[index] = template;
          });
          return template;
        },

        deleteTemplate: async (id: string) => {
          await emailApiClient.templates.delete(id);
          set((state) => {
            state.templates = state.templates.filter((t: EmailTemplate) => t.id !== id);
            if (state.selectedTemplateId === id) state.selectedTemplateId = null;
          });
        },

        selectTemplate: (id: string | null) => {
          set((state) => {
            state.selectedTemplateId = id;
          });
        },

        duplicateTemplate: async (id: string, name?: string) => {
          const template = await emailApiClient.templates.duplicate(id, name);
          set((state) => {
            state.templates.push(template);
          });
          return template;
        },

        previewTemplate: async (id: string, variables: Record<string, string>) => {
          return await emailApiClient.templates.preview(id, variables);
        },

        setTemplateFilter: (filter) => {
          set((state) => {
            state.templateFilter = { ...state.templateFilter, ...filter };
          });
        },

        // ============ Sequence Actions ============

        fetchSequences: async (status?: string) => {
          set((state) => {
            state.sequencesLoading = true;
            state.sequencesError = null;
          });
          try {
            const sequences = await emailApiClient.sequences.list(status);
            set((state) => {
              state.sequences = sequences;
              state.sequencesLoading = false;
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Failed to fetch sequences";
            set((state) => {
              state.sequencesError = message;
              state.sequencesLoading = false;
            });
          }
        },

        createSequence: async (data: EmailSequenceCreateRequest) => {
          const sequence = await emailApiClient.sequences.create(data);
          set((state) => {
            state.sequences.push(sequence);
          });
          return sequence;
        },

        updateSequence: async (id: string, data: EmailSequenceUpdateRequest) => {
          const sequence = await emailApiClient.sequences.update(id, data);
          set((state) => {
            const index = state.sequences.findIndex((s: EmailSequence) => s.id === id);
            if (index !== -1) state.sequences[index] = sequence;
          });
          return sequence;
        },

        deleteSequence: async (id: string) => {
          await emailApiClient.sequences.delete(id);
          set((state) => {
            state.sequences = state.sequences.filter((s: EmailSequence) => s.id !== id);
            if (state.selectedSequenceId === id) {
              state.selectedSequenceId = null;
              state.steps = [];
            }
          });
        },

        selectSequence: (id: string | null) => {
          set((state) => {
            state.selectedSequenceId = id;
            if (!id) {
              state.steps = [];
              state.selectedStepId = null;
            }
          });
          if (id) {
            get().fetchSteps(id);
          }
        },

        activateSequence: async (id: string) => {
          const sequence = await emailApiClient.sequences.activate(id);
          set((state) => {
            const index = state.sequences.findIndex((s: EmailSequence) => s.id === id);
            if (index !== -1) state.sequences[index] = sequence;
          });
          return sequence;
        },

        deactivateSequence: async (id: string) => {
          const sequence = await emailApiClient.sequences.deactivate(id);
          set((state) => {
            const index = state.sequences.findIndex((s: EmailSequence) => s.id === id);
            if (index !== -1) state.sequences[index] = sequence;
          });
          return sequence;
        },

        duplicateSequence: async (id: string, name?: string) => {
          const sequence = await emailApiClient.sequences.duplicate(id, name);
          set((state) => {
            state.sequences.push(sequence);
          });
          return sequence;
        },

        enrollRecipients: async (sequenceId: string, recipientIds: string[]) => {
          return await emailApiClient.sequences.enroll(sequenceId, recipientIds);
        },

        setSequenceFilter: (filter) => {
          set((state) => {
            state.sequenceFilter = { ...state.sequenceFilter, ...filter };
          });
        },

        // ============ Step Actions ============

        fetchSteps: async (sequenceId: string) => {
          set((state) => {
            state.stepsLoading = true;
            state.stepsError = null;
          });
          try {
            const steps = await emailApiClient.steps.list(sequenceId);
            set((state) => {
              state.steps = steps;
              state.stepsLoading = false;
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Failed to fetch steps";
            set((state) => {
              state.stepsError = message;
              state.stepsLoading = false;
            });
          }
        },

        createStep: async (
          sequenceId: string,
          data: Omit<EmailStepCreateRequest, "sequence_id">
        ) => {
          const step = await emailApiClient.steps.create(sequenceId, data);
          set((state) => {
            state.steps.push(step);
            state.steps.sort((a: EmailStep, b: EmailStep) => a.order - b.order);
          });
          return step;
        },

        updateStep: async (
          sequenceId: string,
          stepId: string,
          data: EmailStepUpdateRequest
        ) => {
          const step = await emailApiClient.steps.update(sequenceId, stepId, data);
          set((state) => {
            const index = state.steps.findIndex((s: EmailStep) => s.id === stepId);
            if (index !== -1) state.steps[index] = step;
          });
          return step;
        },

        deleteStep: async (sequenceId: string, stepId: string) => {
          await emailApiClient.steps.delete(sequenceId, stepId);
          set((state) => {
            state.steps = state.steps.filter((s: EmailStep) => s.id !== stepId);
            if (state.selectedStepId === stepId) state.selectedStepId = null;
          });
        },

        selectStep: (id: string | null) => {
          set((state) => {
            state.selectedStepId = id;
          });
        },

        reorderSteps: async (sequenceId: string, stepIds: string[]) => {
          const steps = await emailApiClient.steps.reorder(sequenceId, stepIds);
          set((state) => {
            state.steps = steps;
          });
        },

        toggleStepActive: async (sequenceId: string, stepId: string) => {
          const step = await emailApiClient.steps.toggleActive(sequenceId, stepId);
          set((state) => {
            const index = state.steps.findIndex((s: EmailStep) => s.id === stepId);
            if (index !== -1) state.steps[index] = step;
          });
        },

        // ============ Recipient Actions ============

        fetchRecipients: async (filters, page = 1, pageSize = 50) => {
          set((state) => {
            state.recipientsLoading = true;
            state.recipientsError = null;
          });
          try {
            const response = await emailApiClient.recipients.list(
              filters || get().recipientFilters,
              page,
              pageSize
            );
            set((state) => {
              state.recipients = response.data;
              state.recipientPagination = {
                page: response.page,
                pageSize: response.page_size,
                total: response.total,
                totalPages: response.total_pages,
              };
              state.recipientsLoading = false;
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Failed to fetch recipients";
            set((state) => {
              state.recipientsError = message;
              state.recipientsLoading = false;
            });
          }
        },

        createRecipient: async (data: EmailRecipientCreateRequest) => {
          const recipient = await emailApiClient.recipients.create(data);
          set((state) => {
            state.recipients.unshift(recipient);
          });
          return recipient;
        },

        updateRecipient: async (id: string, data: EmailRecipientUpdateRequest) => {
          const recipient = await emailApiClient.recipients.update(id, data);
          set((state) => {
            const index = state.recipients.findIndex((r: EmailRecipient) => r.id === id);
            if (index !== -1) state.recipients[index] = recipient;
          });
          return recipient;
        },

        deleteRecipient: async (id: string) => {
          await emailApiClient.recipients.delete(id);
          set((state) => {
            state.recipients = state.recipients.filter((r: EmailRecipient) => r.id !== id);
            state.selectedRecipientIds = state.selectedRecipientIds.filter(
              (rid: string) => rid !== id
            );
          });
        },

        selectRecipient: (id: string) => {
          set((state) => {
            if (!state.selectedRecipientIds.includes(id)) {
              state.selectedRecipientIds.push(id);
            }
          });
        },

        deselectRecipient: (id: string) => {
          set((state) => {
            state.selectedRecipientIds = state.selectedRecipientIds.filter(
              (rid: string) => rid !== id
            );
          });
        },

        selectAllRecipients: () => {
          set((state) => {
            state.selectedRecipientIds = state.recipients.map((r: EmailRecipient) => r.id);
          });
        },

        deselectAllRecipients: () => {
          set((state) => {
            state.selectedRecipientIds = [];
          });
        },

        importRecipientsCsv: async (file, fieldMapping, tags, updateExisting) => {
          return await emailApiClient.recipients.importCsv(
            file,
            fieldMapping,
            tags,
            updateExisting
          );
        },

        exportRecipients: async (filters) => {
          return await emailApiClient.recipients.export(filters);
        },

        bulkTagRecipients: async (recipientIds, tags) => {
          const result = await emailApiClient.recipients.bulkTag(recipientIds, tags);
          await get().fetchRecipients();
          return result;
        },

        bulkRemoveTagRecipients: async (recipientIds, tags) => {
          const result = await emailApiClient.recipients.bulkRemoveTag(
            recipientIds,
            tags
          );
          await get().fetchRecipients();
          return result;
        },

        unsubscribeRecipient: async (id: string) => {
          const recipient = await emailApiClient.recipients.unsubscribe(id);
          set((state) => {
            const index = state.recipients.findIndex((r: EmailRecipient) => r.id === id);
            if (index !== -1) state.recipients[index] = recipient;
          });
        },

        resubscribeRecipient: async (id: string) => {
          const recipient = await emailApiClient.recipients.resubscribe(id);
          set((state) => {
            const index = state.recipients.findIndex((r: EmailRecipient) => r.id === id);
            if (index !== -1) state.recipients[index] = recipient;
          });
        },

        setRecipientFilters: (filters) => {
          set((state) => {
            state.recipientFilters = { ...state.recipientFilters, ...filters };
          });
        },

        setRecipientPage: (page: number) => {
          set((state) => {
            state.recipientPagination.page = page;
          });
          get().fetchRecipients(get().recipientFilters, page);
        },

        fetchTags: async () => {
          const tags = await emailApiClient.recipients.getTags();
          set((state) => {
            state.availableTags = tags;
          });
        },

        // ============ Send Actions ============

        fetchSends: async (filters, page = 1, pageSize = 50) => {
          set((state) => {
            state.sendsLoading = true;
            state.sendsError = null;
          });
          try {
            const response = await emailApiClient.sends.list(
              filters || get().sendFilters,
              page,
              pageSize
            );
            set((state) => {
              state.sends = response.data;
              state.sendPagination = {
                page: response.page,
                pageSize: response.page_size,
                total: response.total,
                totalPages: response.total_pages,
              };
              state.sendsLoading = false;
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Failed to fetch sends";
            set((state) => {
              state.sendsError = message;
              state.sendsLoading = false;
            });
          }
        },

        resendEmail: async (id: string) => {
          const send = await emailApiClient.sends.resend(id);
          set((state) => {
            const index = state.sends.findIndex((s: EmailSend) => s.id === id);
            if (index !== -1) state.sends[index] = send;
          });
          return send;
        },

        cancelSend: async (id: string) => {
          const send = await emailApiClient.sends.cancel(id);
          set((state) => {
            const index = state.sends.findIndex((s: EmailSend) => s.id === id);
            if (index !== -1) state.sends[index] = send;
          });
          return send;
        },

        setSendFilters: (filters) => {
          set((state) => {
            state.sendFilters = { ...state.sendFilters, ...filters };
          });
        },

        setSendPage: (page: number) => {
          set((state) => {
            state.sendPagination.page = page;
          });
          get().fetchSends(get().sendFilters, page);
        },

        // ============ Event Actions ============

        fetchEvents: async (sendId: string) => {
          set((state) => {
            state.eventsLoading = true;
          });
          try {
            const events = await emailApiClient.sends.getEvents(sendId);
            set((state) => {
              state.events = events;
              state.eventsLoading = false;
            });
          } catch {
            set((state) => {
              state.eventsLoading = false;
            });
          }
        },

        fetchRecipientActivity: async (recipientId: string) => {
          set((state) => {
            state.eventsLoading = true;
          });
          try {
            const events = await emailApiClient.recipients.getActivity(recipientId);
            set((state) => {
              state.events = events;
              state.eventsLoading = false;
            });
          } catch {
            set((state) => {
              state.eventsLoading = false;
            });
          }
        },

        // ============ Enrollment Actions ============

        fetchEnrollments: async (sequenceId: string, status?: string) => {
          set((state) => {
            state.enrollmentsLoading = true;
          });
          try {
            const enrollments = await emailApiClient.sequences.getEnrollments(
              sequenceId,
              status
            );
            set((state) => {
              state.enrollments = enrollments;
              state.enrollmentsLoading = false;
            });
          } catch {
            set((state) => {
              state.enrollmentsLoading = false;
            });
          }
        },

        removeEnrollment: async (sequenceId: string, enrollmentId: string) => {
          await emailApiClient.sequences.removeEnrollment(sequenceId, enrollmentId);
          set((state) => {
            state.enrollments = state.enrollments.filter(
              (e: SequenceEnrollment) => e.id !== enrollmentId
            );
          });
        },

        // ============ UI Actions ============

        setShowProviderSetup: (show: boolean) => {
          set((state) => {
            state.showProviderSetup = show;
          });
        },

        setShowTemplateEditor: (show: boolean) => {
          set((state) => {
            state.showTemplateEditor = show;
          });
        },

        setShowSequenceBuilder: (show: boolean) => {
          set((state) => {
            state.showSequenceBuilder = show;
          });
        },

        setShowRecipientImport: (show: boolean) => {
          set((state) => {
            state.showRecipientImport = show;
          });
        },

        setEditorTab: (tab) => {
          set((state) => {
            state.editorTab = tab;
          });
        },

        // ============ Reset Actions ============

        reset: () => {
          set(initialState);
        },

        resetSequence: () => {
          set((state) => {
            state.selectedSequenceId = null;
            state.steps = [];
            state.selectedStepId = null;
            state.enrollments = [];
          });
        },
      })),
      {
        name: "flowcube-email-store",
        partialize: (state) => ({
          selectedProviderId: state.selectedProviderId,
          templateFilter: state.templateFilter,
          sequenceFilter: state.sequenceFilter,
          recipientFilters: state.recipientFilters,
          sendFilters: state.sendFilters,
        }),
      }
    ),
    { name: "EmailStore" }
  )
);

// ============ Selectors ============

export const useSelectedProvider = () => {
  const providers = useEmailStore((state) => state.providers);
  const selectedId = useEmailStore((state) => state.selectedProviderId);
  return providers.find((p: EmailProvider) => p.id === selectedId) || null;
};

export const useDefaultProvider = () => {
  const providers = useEmailStore((state) => state.providers);
  return providers.find((p: EmailProvider) => p.is_default) || providers[0] || null;
};

export const useSelectedTemplate = () => {
  const templates = useEmailStore((state) => state.templates);
  const selectedId = useEmailStore((state) => state.selectedTemplateId);
  return templates.find((t: EmailTemplate) => t.id === selectedId) || null;
};

export const useSelectedSequence = () => {
  const sequences = useEmailStore((state) => state.sequences);
  const selectedId = useEmailStore((state) => state.selectedSequenceId);
  return sequences.find((s: EmailSequence) => s.id === selectedId) || null;
};

export const useSequenceSteps = () => {
  return useEmailStore((state) => state.steps);
};

export const useSelectedStep = () => {
  const steps = useEmailStore((state) => state.steps);
  const selectedId = useEmailStore((state) => state.selectedStepId);
  return steps.find((s: EmailStep) => s.id === selectedId) || null;
};

export const useFilteredTemplates = () => {
  const templates = useEmailStore((state) => state.templates);
  const filter = useEmailStore((state) => state.templateFilter);

  return templates.filter((t: EmailTemplate) => {
    if (filter.category && t.category !== filter.category) return false;
    if (
      filter.search &&
      !t.name.toLowerCase().includes(filter.search.toLowerCase()) &&
      !t.subject.toLowerCase().includes(filter.search.toLowerCase())
    )
      return false;
    return true;
  });
};

export const useFilteredSequences = () => {
  const sequences = useEmailStore((state) => state.sequences);
  const filter = useEmailStore((state) => state.sequenceFilter);

  return sequences.filter((s: EmailSequence) => {
    if (filter.status && s.status !== filter.status) return false;
    return true;
  });
};

export const useFilteredRecipients = () => {
  return useEmailStore((state) => state.recipients);
};

export const useSelectedRecipients = () => {
  const recipients = useEmailStore((state) => state.recipients);
  const selectedIds = useEmailStore((state) => state.selectedRecipientIds);
  return recipients.filter((r: EmailRecipient) => selectedIds.includes(r.id));
};

export default useEmailStore;
