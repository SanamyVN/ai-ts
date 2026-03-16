import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type {
  PromptTemplate,
  PromptVersion,
  ResolvedPrompt,
  CreatePromptInput,
  UpdatePromptInput,
  CreateVersionInput,
  PromptFilter,
} from './prompt.model.js';

/** Manages versioned prompt templates with Mustache rendering. */
export interface IPromptService {
  /**
   * Creates a new prompt template.
   * @param input - Prompt definition including name, slug, and optional schema.
   * @returns The created prompt template.
   * @throws {PromptAlreadyExistsError} If a prompt with the same slug exists.
   */
  create(input: CreatePromptInput): Promise<PromptTemplate>;

  /**
   * Retrieves a prompt template by its unique slug.
   * @param slug - URL-friendly identifier for the prompt.
   * @returns The prompt template.
   * @throws {PromptNotFoundError} If no prompt matches the slug.
   */
  getBySlug(slug: string): Promise<PromptTemplate>;

  /**
   * Lists prompt templates matching an optional filter.
   * @param filter - Optional search criteria.
   * @returns Array of matching prompt templates.
   */
  list(filter?: PromptFilter): Promise<PromptTemplate[]>;

  /**
   * Updates a prompt template's mutable fields.
   * @param id - Prompt template ID.
   * @param input - Fields to update.
   * @returns The updated prompt template.
   * @throws {PromptNotFoundError} If the prompt does not exist.
   */
  update(id: string, input: UpdatePromptInput): Promise<PromptTemplate>;

  /**
   * Creates a new version of a prompt template.
   * @param promptId - Parent prompt template ID.
   * @param input - Version content and optional activation flag.
   * @returns The created prompt version.
   * @throws {PromptNotFoundError} If the parent prompt does not exist.
   */
  createVersion(promptId: string, input: CreateVersionInput): Promise<PromptVersion>;

  /**
   * Lists all versions for a given prompt template.
   * @param promptId - Prompt template ID.
   * @returns Array of prompt versions ordered by version number.
   * @throws {PromptNotFoundError} If the prompt does not exist.
   */
  listVersions(promptId: string): Promise<PromptVersion[]>;

  /**
   * Sets the active version for a prompt template.
   * @param promptId - Prompt template ID.
   * @param versionId - Version ID to activate.
   * @throws {PromptNotFoundError} If the prompt does not exist.
   * @throws {PromptVersionNotFoundError} If the version does not exist.
   */
  setActiveVersion(promptId: string, versionId: string): Promise<void>;

  /**
   * Resolves a prompt slug to rendered text by applying parameters to the active version's Mustache template.
   * @param slug - Prompt slug to resolve.
   * @param params - Parameter values to inject into the template.
   * @returns The resolved prompt containing rendered text and version info.
   * @throws {PromptNotFoundError} If the prompt does not exist.
   * @throws {InvalidPromptParametersError} If parameters don't match the schema.
   * @throws {PromptRenderError} If Mustache rendering fails.
   *
   * @example
   * ```ts
   * const resolved = await promptService.resolve('welcome-email', {
   *   name: 'Alice',
   *   role: 'admin',
   * });
   * console.log(resolved.text); // "Hello Alice, welcome as admin!"
   * ```
   */
  resolve(slug: string, params: Record<string, unknown>): Promise<ResolvedPrompt>;
}

/** Dependency-injection token for {@link IPromptService}. */
export const PROMPT_SERVICE = createToken<IPromptService>('PROMPT_SERVICE');
