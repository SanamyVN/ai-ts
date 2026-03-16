import type {
  TextToSpeechResult,
  SpeechToTextResult,
  GetSpeakersResult,
} from '@/business/domain/voice/voice.model.js';
import type {
  TextToSpeechClientResult,
  SpeechToTextClientResult,
  GetSpeakersClientResult,
} from '@/business/domain/voice/client/schemas.js';

export async function toTextToSpeechClientResult(
  result: TextToSpeechResult,
): Promise<TextToSpeechClientResult> {
  const chunks: Buffer[] = [];
  for await (const chunk of result.audioStream) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    chunks.push(Buffer.from(chunk as never));
  }
  return {
    audio: Buffer.concat(chunks).toString('base64'),
    contentType: 'audio/mpeg',
  };
}

export function toSpeechToTextClientResult(result: SpeechToTextResult): SpeechToTextClientResult {
  return { text: result.text };
}

export function toGetSpeakersClientResult(result: GetSpeakersResult): GetSpeakersClientResult {
  return { speakers: result.speakers };
}
