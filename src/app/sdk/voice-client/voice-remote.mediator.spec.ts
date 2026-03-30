import { describe, expect, it, beforeEach, vi } from 'vitest';
import { VoiceRemoteMediator, type HttpClient } from './voice-remote.mediator.js';
import { VoiceTextToSpeechCommand } from '@/business/domain/voice/client/queries.js';

describe('VoiceRemoteMediator', () => {
  let mediator: VoiceRemoteMediator;
  let http: HttpClient;
  const config = { baseUrl: 'https://ai.example.com' };

  beforeEach(() => {
    http = {
      post: vi.fn(),
      get: vi.fn(),
    };
    mediator = new VoiceRemoteMediator(http, config);
  });

  describe('textToSpeech', () => {
    it('sends speakerGender in payload and returns parsed response', async () => {
      vi.mocked(http.post).mockResolvedValue({
        ok: true,
        body: {
          data: {
            audio: 'aGVsbG8=',
            contentType: 'audio/mpeg',
          },
        },
      });

      const command = new VoiceTextToSpeechCommand({
        text: 'hello',
        speakerGender: 'female',
        options: { speed: 1.2 },
      });

      const result = await mediator.textToSpeech(command);

      expect(http.post).toHaveBeenCalledWith(
        'https://ai.example.com/ai/voice/text-to-speech',
        {
          text: 'hello',
          speakerGender: 'female',
          options: { speed: 1.2 },
        },
      );
      expect(result).toEqual({
        audio: 'aGVsbG8=',
        contentType: 'audio/mpeg',
      });
    });
  });
});
