// src/foundation/ai-metrics/ai-metrics.spec.ts

import { describe, expect, it, beforeEach } from 'vitest';
import { createMockTelemetry } from '@sanamyvn/foundation/telemetry/testing';
import type { MockTelemetry } from '@sanamyvn/foundation/telemetry/testing';
import { AiMetrics } from './ai-metrics.js';
import type { LlmUsageInput } from './ai-metrics.model.js';

let telemetry: MockTelemetry;
let aiMetrics: AiMetrics;

beforeEach(() => {
  telemetry = createMockTelemetry();
  aiMetrics = new AiMetrics(telemetry);
});

describe('recordLlmUsage', () => {
  const baseInput: LlmUsageInput = {
    model: 'gpt-4o',
    userId: 'user-1',
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
  };

  it('increments ai.tokens.input counter with correct value', () => {
    aiMetrics.recordLlmUsage(baseInput);
    expect(telemetry.counters.get('ai.tokens.input')?.value).toBe(100);
  });

  it('increments ai.tokens.output counter with correct value', () => {
    aiMetrics.recordLlmUsage(baseInput);
    expect(telemetry.counters.get('ai.tokens.output')?.value).toBe(50);
  });

  it('records ai.tokens.per_operation histogram with totalTokens', () => {
    aiMetrics.recordLlmUsage(baseInput);
    expect(telemetry.histograms.get('ai.tokens.per_operation')?.values).toEqual([150]);
  });

  it('sets ai.model and user.id as attributes', () => {
    aiMetrics.recordLlmUsage(baseInput);
    const attrs = telemetry.counters.get('ai.tokens.input')?.lastAttributes;
    expect(attrs).toMatchObject({ 'ai.model': 'gpt-4o', 'user.id': 'user-1' });
  });

  it('merges metricsContext into attributes', () => {
    aiMetrics.recordLlmUsage({ ...baseInput, metricsContext: { 'ai.operation': 'ta_chat' } });
    const attrs = telemetry.counters.get('ai.tokens.input')?.lastAttributes;
    expect(attrs).toMatchObject({
      'ai.model': 'gpt-4o',
      'user.id': 'user-1',
      'ai.operation': 'ta_chat',
    });
  });

  it('works without metricsContext', () => {
    expect(() => aiMetrics.recordLlmUsage(baseInput)).not.toThrow();
    expect(telemetry.counters.get('ai.tokens.input')?.value).toBe(100);
  });

  it('accumulates across multiple calls', () => {
    aiMetrics.recordLlmUsage(baseInput);
    aiMetrics.recordLlmUsage({
      ...baseInput,
      inputTokens: 200,
      outputTokens: 75,
      totalTokens: 275,
    });
    expect(telemetry.counters.get('ai.tokens.input')?.value).toBe(300);
    expect(telemetry.counters.get('ai.tokens.output')?.value).toBe(125);
    expect(telemetry.histograms.get('ai.tokens.per_operation')?.values).toEqual([150, 275]);
  });
});

describe('recordSttUsage', () => {
  it('increments ai.stt.seconds counter', () => {
    aiMetrics.recordSttUsage({ model: 'whisper-1', userId: 'user-2', durationSeconds: 30 });
    expect(telemetry.counters.get('ai.stt.seconds')?.value).toBe(30);
  });

  it('records ai.stt.duration_per_session histogram', () => {
    aiMetrics.recordSttUsage({ model: 'whisper-1', userId: 'user-2', durationSeconds: 45 });
    expect(telemetry.histograms.get('ai.stt.duration_per_session')?.values).toEqual([45]);
  });

  it('merges metricsContext into attributes', () => {
    aiMetrics.recordSttUsage({
      model: 'whisper-1',
      userId: 'user-2',
      durationSeconds: 10,
      metricsContext: { 'session.id': 'sess-abc' },
    });
    const attrs = telemetry.counters.get('ai.stt.seconds')?.lastAttributes;
    expect(attrs).toMatchObject({
      'ai.model': 'whisper-1',
      'user.id': 'user-2',
      'session.id': 'sess-abc',
    });
  });
});

describe('recordTtsUsage', () => {
  it('increments ai.tts.characters counter', () => {
    aiMetrics.recordTtsUsage({ model: 'tts-1', userId: 'user-3', characterCount: 500 });
    expect(telemetry.counters.get('ai.tts.characters')?.value).toBe(500);
  });

  it('records ai.tts.characters_per_response histogram', () => {
    aiMetrics.recordTtsUsage({ model: 'tts-1', userId: 'user-3', characterCount: 250 });
    expect(telemetry.histograms.get('ai.tts.characters_per_response')?.values).toEqual([250]);
  });

  it('merges metricsContext into attributes', () => {
    aiMetrics.recordTtsUsage({
      model: 'tts-1',
      userId: 'user-3',
      characterCount: 100,
      metricsContext: { 'voice.id': 'v-en' },
    });
    const attrs = telemetry.counters.get('ai.tts.characters')?.lastAttributes;
    expect(attrs).toMatchObject({ 'ai.model': 'tts-1', 'user.id': 'user-3', 'voice.id': 'v-en' });
  });
});

describe('recordEmbeddingUsage', () => {
  it('increments ai.tokens.embedding counter', () => {
    aiMetrics.recordEmbeddingUsage({
      model: 'text-embedding-3',
      userId: 'user-4',
      totalTokens: 400,
    });
    expect(telemetry.counters.get('ai.tokens.embedding')?.value).toBe(400);
  });

  it('does not record a histogram value', () => {
    aiMetrics.recordEmbeddingUsage({
      model: 'text-embedding-3',
      userId: 'user-4',
      totalTokens: 400,
    });
    const allValues = [...telemetry.histograms.values()].flatMap((h) => h.values);
    expect(allValues).toHaveLength(0);
  });

  it('merges metricsContext into attributes', () => {
    aiMetrics.recordEmbeddingUsage({
      model: 'text-embedding-3',
      userId: 'user-4',
      totalTokens: 200,
      metricsContext: { 'rag.collection': 'docs' },
    });
    const attrs = telemetry.counters.get('ai.tokens.embedding')?.lastAttributes;
    expect(attrs).toMatchObject({
      'ai.model': 'text-embedding-3',
      'user.id': 'user-4',
      'rag.collection': 'docs',
    });
  });
});

describe('recordOperation', () => {
  it('increments ai.operations.count counter with status attribute', () => {
    aiMetrics.recordOperation({
      model: 'gpt-4o',
      userId: 'user-5',
      status: 'success',
      latencyMs: 200,
    });
    expect(telemetry.counters.get('ai.operations.count')?.value).toBe(1);
    expect(telemetry.counters.get('ai.operations.count')?.lastAttributes).toMatchObject({
      'ai.status': 'success',
    });
  });

  it('records ai.latency histogram', () => {
    aiMetrics.recordOperation({
      model: 'gpt-4o',
      userId: 'user-5',
      status: 'success',
      latencyMs: 350,
    });
    expect(telemetry.histograms.get('ai.latency')?.values).toEqual([350]);
  });

  it('records error status', () => {
    aiMetrics.recordOperation({
      model: 'gpt-4o',
      userId: 'user-5',
      status: 'error',
      latencyMs: 50,
    });
    expect(telemetry.counters.get('ai.operations.count')?.lastAttributes).toMatchObject({
      'ai.status': 'error',
    });
  });

  it('merges metricsContext into attributes', () => {
    aiMetrics.recordOperation({
      model: 'gpt-4o',
      userId: 'user-5',
      status: 'success',
      latencyMs: 100,
      metricsContext: { 'ai.operation': 'summarize' },
    });
    const attrs = telemetry.counters.get('ai.operations.count')?.lastAttributes;
    expect(attrs).toMatchObject({
      'ai.model': 'gpt-4o',
      'user.id': 'user-5',
      'ai.status': 'success',
      'ai.operation': 'summarize',
    });
  });

  it('records cancelled status', () => {
    aiMetrics.recordOperation({
      model: 'gpt-4o',
      userId: 'user-5',
      status: 'cancelled',
      latencyMs: 2300,
    });

    const counter = telemetry.counters.get('ai.operations.count');
    expect(counter?.lastAttributes).toMatchObject({ 'ai.status': 'cancelled' });
    expect(telemetry.histograms.get('ai.latency')?.values).toEqual([2300]);
  });
});
