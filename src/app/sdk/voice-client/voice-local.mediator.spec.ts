import { describe, expect, it, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { VoiceLocalMediator } from './voice-local.mediator.js';
import { createMockVoiceBusiness } from '@/business/domain/voice/voice.testing.js';
import { VoiceTextToSpeechCommand } from '@/business/domain/voice/client/queries.js';

describe('VoiceLocalMediator', () => {
  let mediator: VoiceLocalMediator;
  let voiceBusiness: ReturnType<typeof createMockVoiceBusiness>;

  beforeEach(() => {
    voiceBusiness = createMockVoiceBusiness();
    mediator = new VoiceLocalMediator(voiceBusiness);
  });

  describe('textToSpeech', () => {
    it('passes speakerGender and options through to VoiceBusiness and maps the response', async () => {
      const audioStream = Readable.from([Buffer.from('hello')]);
      voiceBusiness.textToSpeech.mockResolvedValue({ audioStream });

      const command = new VoiceTextToSpeechCommand({
        text: 'hello',
        speakerGender: 'male',
        options: { speed: 1.1 },
      });

      const result = await mediator.textToSpeech(command);

      expect(voiceBusiness.textToSpeech).toHaveBeenCalledWith({
        text: 'hello',
        speakerGender: 'male',
        options: { speed: 1.1 },
      });
      expect(result).toEqual({
        audio: Buffer.from('hello').toString('base64'),
        contentType: 'audio/mpeg',
      });
    });
  });
});
