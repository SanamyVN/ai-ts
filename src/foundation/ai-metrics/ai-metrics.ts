// src/foundation/ai-metrics/ai-metrics.ts

import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { TELEMETRY } from '@sanamyvn/foundation/telemetry/module';
import type { ITelemetry } from '@sanamyvn/foundation/telemetry';
import { MetricName } from '@sanamyvn/foundation/telemetry/naming';
import type { IAiMetrics } from './ai-metrics.interface.js';
import type {
  LlmUsageInput,
  SttUsageInput,
  TtsUsageInput,
  EmbeddingUsageInput,
  OperationInput,
  MetricsContext,
} from './ai-metrics.model.js';

type Counter = ReturnType<ITelemetry['counter']>;
type Histogram = ReturnType<ITelemetry['histogram']>;

function buildAttributes(
  model: string,
  userId: string,
  metricsContext?: MetricsContext,
): Record<string, string> {
  return { 'ai.model': model, 'user.id': userId, ...metricsContext };
}

/** Records AI cost metrics via OTel counters and histograms. */
@Injectable()
export class AiMetrics implements IAiMetrics {
  private readonly inputTokensCounter: Counter;
  private readonly outputTokensCounter: Counter;
  private readonly embeddingTokensCounter: Counter;
  private readonly operationsCounter: Counter;
  private readonly sttSecondsCounter: Counter;
  private readonly ttsCharactersCounter: Counter;

  private readonly tokensPerOperationHistogram: Histogram;
  private readonly latencyHistogram: Histogram;
  private readonly sttDurationHistogram: Histogram;
  private readonly ttsCharactersHistogram: Histogram;

  constructor(@Inject(TELEMETRY) telemetry: ITelemetry) {
    this.inputTokensCounter = telemetry.counter(MetricName.from('ai.tokens.input'), {
      description: 'Total LLM input tokens consumed',
      unit: 'tokens',
    });
    this.outputTokensCounter = telemetry.counter(MetricName.from('ai.tokens.output'), {
      description: 'Total LLM output tokens consumed',
      unit: 'tokens',
    });
    this.embeddingTokensCounter = telemetry.counter(MetricName.from('ai.tokens.embedding'), {
      description: 'Total embedding tokens consumed',
      unit: 'tokens',
    });
    this.operationsCounter = telemetry.counter(MetricName.from('ai.operations.count'), {
      description: 'Total AI operations executed',
    });
    this.sttSecondsCounter = telemetry.counter(MetricName.from('ai.stt.seconds'), {
      description: 'Total speech-to-text audio seconds processed',
      unit: 's',
    });
    this.ttsCharactersCounter = telemetry.counter(MetricName.from('ai.tts.characters'), {
      description: 'Total text-to-speech characters processed',
      unit: 'characters',
    });

    this.tokensPerOperationHistogram = telemetry.histogram(
      MetricName.from('ai.tokens.per_operation'),
      {
        description: 'Token count per LLM operation',
        unit: 'tokens',
      },
    );
    this.latencyHistogram = telemetry.histogram(MetricName.from('ai.latency'), {
      description: 'AI operation latency',
      unit: 'ms',
    });
    this.sttDurationHistogram = telemetry.histogram(
      MetricName.from('ai.stt.duration_per_session'),
      {
        description: 'STT audio duration per session',
        unit: 's',
      },
    );
    this.ttsCharactersHistogram = telemetry.histogram(
      MetricName.from('ai.tts.characters_per_response'),
      {
        description: 'TTS character count per response',
        unit: 'characters',
      },
    );
  }

  /** Record LLM token usage (generate or stream finish). */
  recordLlmUsage(input: LlmUsageInput): void {
    const attrs = buildAttributes(input.model, input.userId, input.metricsContext);
    this.inputTokensCounter.add(input.inputTokens, attrs);
    this.outputTokensCounter.add(input.outputTokens, attrs);
    this.tokensPerOperationHistogram.record(input.totalTokens, attrs);
  }

  /** Record speech-to-text processing. */
  recordSttUsage(input: SttUsageInput): void {
    const attrs = buildAttributes(input.model, input.userId, input.metricsContext);
    this.sttSecondsCounter.add(input.durationSeconds, attrs);
    this.sttDurationHistogram.record(input.durationSeconds, attrs);
  }

  /** Record text-to-speech processing. */
  recordTtsUsage(input: TtsUsageInput): void {
    const attrs = buildAttributes(input.model, input.userId, input.metricsContext);
    this.ttsCharactersCounter.add(input.characterCount, attrs);
    this.ttsCharactersHistogram.record(input.characterCount, attrs);
  }

  /** Record RAG embedding token usage. */
  recordEmbeddingUsage(input: EmbeddingUsageInput): void {
    const attrs = buildAttributes(input.model, input.userId, input.metricsContext);
    this.embeddingTokensCounter.add(input.totalTokens, attrs);
  }

  /** Record an AI operation (success or error) with latency. */
  recordOperation(input: OperationInput): void {
    const attrs = {
      ...buildAttributes(input.model, input.userId, input.metricsContext),
      'ai.status': input.status,
    };
    this.operationsCounter.add(1, attrs);
    this.latencyHistogram.record(input.latencyMs, attrs);
  }
}
