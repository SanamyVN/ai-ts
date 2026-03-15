import { describe, expect, it } from 'vitest';
import { MastraAdapterError, isMastraAdapterError } from './mastra.error.js';

describe('MastraAdapterError', () => {
  it('sets name and operation', () => {
    const error = new MastraAdapterError('generate');
    expect(error.name).toBe('MastraAdapterError');
    expect(error.operation).toBe('generate');
  });

  it('wraps cause', () => {
    const cause = new Error('network');
    const error = new MastraAdapterError('generate', cause);
    expect(error.cause).toBe(cause);
  });

  it('type guard narrows correctly', () => {
    const error = new MastraAdapterError('generate');
    expect(isMastraAdapterError(error)).toBe(true);
    expect(isMastraAdapterError(new Error('other'))).toBe(false);
  });
});
