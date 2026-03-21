import type { ProcessAudioClientResult } from '@/business/domain/realtime-voice/client/schemas.js';
import type { ProcessAudioResponseDto } from './realtime-voice.dto.js';

export function toProcessAudioResponseDto(
  result: ProcessAudioClientResult,
): ProcessAudioResponseDto {
  return { vad: result.vad, events: result.events };
}
