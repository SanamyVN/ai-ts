import type { DetectSpeechClientResult } from '@/business/domain/vad/client/schemas.js';
import type { DetectSpeechResponseDto } from './vad.dto.js';

export function toDetectSpeechResponseDto(
  result: DetectSpeechClientResult,
): DetectSpeechResponseDto {
  return { isSpeech: result.isSpeech, probability: result.probability };
}
