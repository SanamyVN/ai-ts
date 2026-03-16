import type {
  GetSpeakersClientResult,
  SpeechToTextClientResult,
} from '@/business/domain/voice/client/schemas.js';
import type { SpeechToTextResponseDto, GetSpeakersResponseDto } from './voice.dto.js';

export function toSpeechToTextResponseDto(
  result: SpeechToTextClientResult,
): SpeechToTextResponseDto {
  return { text: result.text };
}

export function toGetSpeakersResponseDto(result: GetSpeakersClientResult): GetSpeakersResponseDto {
  return { speakers: result.speakers };
}
