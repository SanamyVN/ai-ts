export interface PromptTemplate {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly parameterSchema: Record<string, unknown> | null;
  readonly metadata: Record<string, unknown> | null;
  readonly activeVersion?: PromptVersion;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PromptVersion {
  readonly id: string;
  readonly promptId: string;
  readonly version: number;
  readonly template: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
}

export interface ResolvedPrompt {
  readonly slug: string;
  readonly version: number;
  readonly text: string;
}

export interface CreatePromptInput {
  readonly name: string;
  readonly slug: string;
  readonly parameterSchema?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}

export interface UpdatePromptInput {
  readonly name?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface CreateVersionInput {
  readonly template: string;
  readonly activate?: boolean;
}

export interface PromptFilter {
  readonly search?: string;
}
