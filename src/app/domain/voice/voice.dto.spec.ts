import { describe, expect, it } from 'vitest';
import { textToSpeechRequestDto } from './voice.dto.js';

describe('textToSpeechRequestDto', () => {
  it('requires speakerGender and preserves it in parsed output', () => {
    const result = textToSpeechRequestDto.safeParse({
      text: 'hello',
      speakerGender: 'female',
      options: { speed: 1.1 },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        text: 'hello',
        speakerGender: 'female',
        options: { speed: 1.1 },
      });
    }
  });

  it('rejects missing speakerGender', () => {
    const result = textToSpeechRequestDto.safeParse({ text: 'hello' });

    expect(result.success).toBe(false);
  });
});
