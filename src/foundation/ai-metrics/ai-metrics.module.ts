import { Module } from '@sanamyvn/foundation/di/node/module';
import { TelemetryModule } from '@sanamyvn/foundation/telemetry/module';
import { bind } from '@sanamyvn/foundation/di/node/providers';
import { AI_METRICS } from './ai-metrics.interface.js';
import { AiMetrics } from './ai-metrics.js';

/**
 * DI module that registers the {@link AI_METRICS} token.
 * Imports {@link TelemetryModule} to provide the `ITelemetry` dependency.
 *
 * @example
 * ```typescript
 * // In the app root module
 * container.load(AiMetricsModule);
 * ```
 */
export class AiMetricsModule extends Module {
  imports = [TelemetryModule];
  providers = [bind(AI_METRICS, AiMetrics)];
  exports = [AI_METRICS] as const;
}
