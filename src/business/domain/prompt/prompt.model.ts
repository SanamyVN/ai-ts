/** A named, versioned prompt template used to generate system or user prompts. */
export interface PromptTemplate {
  readonly id: string;
  readonly name: string;
  /** URL-friendly unique identifier. */
  readonly slug: string;
  /** JSON key-type map defining expected Mustache parameters, or `null` when untyped. */
  readonly parameterSchema: Record<string, unknown> | null;
  readonly metadata: Record<string, unknown> | null;
  /** The currently active version; present only when explicitly loaded. */
  readonly activeVersion?: PromptVersion;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** An immutable snapshot of a prompt template's Mustache content at a given version number. */
export interface PromptVersion {
  readonly id: string;
  readonly promptId: string;
  readonly version: number;
  /** Mustache template string. */
  readonly template: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
}

/** The output of rendering a prompt template with concrete parameter values. */
export interface ResolvedPrompt {
  readonly slug: string;
  readonly version: number;
  /** Fully rendered prompt text after Mustache interpolation. */
  readonly text: string;
}

/** Input for creating a new prompt template. */
export interface CreatePromptInput {
  readonly name: string;
  readonly slug: string;
  readonly parameterSchema?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}

/** Input for updating a prompt template's mutable fields. */
export interface UpdatePromptInput {
  readonly name?: string;
  readonly metadata?: Record<string, unknown>;
}

/** Input for creating a new version of a prompt template. */
export interface CreateVersionInput {
  /** Mustache template string for this version. */
  readonly template: string;
  /** When `true`, this version is immediately set as the active version. */
  readonly activate?: boolean;
}

/** Criteria for filtering prompt templates in list queries. */
export interface PromptFilter {
  /** Free-text search applied to name and slug. */
  readonly search?: string;
}
