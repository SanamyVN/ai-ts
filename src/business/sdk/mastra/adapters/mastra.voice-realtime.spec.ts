import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MastraVoiceRealtimeAdapter } from './mastra.voice-realtime.js';
import { MastraAdapterError } from '../mastra.error.js';
import { Readable } from 'node:stream';

function createMockVoice() {
  return {
    connect: vi.fn(),
    close: vi.fn(),
    send: vi.fn(),
    speak: vi.fn(),
    answer: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    addTools: vi.fn(),
    addInstructions: vi.fn(),
    updateConfig: vi.fn(),
  };
}

describe('MastraVoiceRealtimeAdapter', () => {
  let mockVoice: ReturnType<typeof createMockVoice>;
  let adapter: MastraVoiceRealtimeAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVoice = createMockVoice();
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    adapter = new MastraVoiceRealtimeAdapter(mockVoice as never);
  });

  describe('openSession', () => {
    it('delegates to voice.connect', async () => {
      mockVoice.connect.mockResolvedValue(undefined);

      await adapter.openSession({ timeout: 5000 });

      expect(mockVoice.connect).toHaveBeenCalledWith({ timeout: 5000 });
    });

    it('wraps errors as MastraAdapterError', async () => {
      mockVoice.connect.mockRejectedValue(new Error('ws error'));

      await expect(adapter.openSession()).rejects.toThrow(MastraAdapterError);
      await expect(adapter.openSession()).rejects.toThrow(/openSession/);
    });
  });

  describe('closeSession', () => {
    it('delegates to voice.close', () => {
      adapter.closeSession();
      expect(mockVoice.close).toHaveBeenCalled();
    });

    it('wraps errors as MastraAdapterError', () => {
      mockVoice.close.mockImplementation(() => {
        throw new Error('close error');
      });

      expect(() => adapter.closeSession()).toThrow(MastraAdapterError);
    });
  });

  describe('sendAudio', () => {
    it('delegates to voice.send with a stream', async () => {
      mockVoice.send.mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const audioStream = new Readable({ read() {} });

      await adapter.sendAudio(audioStream);

      expect(mockVoice.send).toHaveBeenCalledWith(audioStream);
    });

    it('delegates to voice.send with Int16Array', async () => {
      mockVoice.send.mockResolvedValue(undefined);
      const audioData = new Int16Array([1, 2, 3]);

      await adapter.sendAudio(audioData);

      expect(mockVoice.send).toHaveBeenCalledWith(audioData);
    });

    it('wraps errors as MastraAdapterError', async () => {
      mockVoice.send.mockRejectedValue(new Error('send error'));

      await expect(adapter.sendAudio(new Int16Array())).rejects.toThrow(MastraAdapterError);
    });
  });

  describe('sendText', () => {
    it('delegates to voice.speak', async () => {
      mockVoice.speak.mockResolvedValue(undefined);

      await adapter.sendText('hello');

      expect(mockVoice.speak).toHaveBeenCalledWith('hello');
    });

    it('wraps errors as MastraAdapterError', async () => {
      mockVoice.speak.mockRejectedValue(new Error('speak error'));

      await expect(adapter.sendText('hello')).rejects.toThrow(MastraAdapterError);
    });
  });

  describe('triggerResponse', () => {
    it('delegates to voice.answer', async () => {
      mockVoice.answer.mockResolvedValue(undefined);

      await adapter.triggerResponse({ force: true });

      expect(mockVoice.answer).toHaveBeenCalledWith({ force: true });
    });

    it('wraps errors as MastraAdapterError', async () => {
      mockVoice.answer.mockRejectedValue(new Error('answer error'));

      await expect(adapter.triggerResponse()).rejects.toThrow(MastraAdapterError);
    });
  });

  describe('onEvent', () => {
    it('delegates to voice.on', () => {
      const cb = vi.fn();
      adapter.onEvent('speaker', cb);
      expect(mockVoice.on).toHaveBeenCalledWith('speaker', cb);
    });

    it('wraps errors as MastraAdapterError', () => {
      mockVoice.on.mockImplementation(() => {
        throw new Error('on error');
      });

      expect(() => adapter.onEvent('speaker', vi.fn())).toThrow(MastraAdapterError);
    });
  });

  describe('offEvent', () => {
    it('delegates to voice.off', () => {
      const cb = vi.fn();
      adapter.offEvent('speaker', cb);
      expect(mockVoice.off).toHaveBeenCalledWith('speaker', cb);
    });

    it('wraps errors as MastraAdapterError', () => {
      mockVoice.off.mockImplementation(() => {
        throw new Error('off error');
      });

      expect(() => adapter.offEvent('speaker', vi.fn())).toThrow(MastraAdapterError);
    });
  });

  describe('addTools', () => {
    it('delegates to voice.addTools', () => {
      const tools = { search: {} };
      adapter.addTools(tools);
      expect(mockVoice.addTools).toHaveBeenCalledWith(tools);
    });

    it('wraps errors as MastraAdapterError', () => {
      mockVoice.addTools.mockImplementation(() => {
        throw new Error('tools error');
      });

      expect(() => adapter.addTools({})).toThrow(MastraAdapterError);
    });
  });

  describe('addInstructions', () => {
    it('delegates to voice.addInstructions', () => {
      adapter.addInstructions('Be helpful');
      expect(mockVoice.addInstructions).toHaveBeenCalledWith('Be helpful');
    });

    it('wraps errors as MastraAdapterError', () => {
      mockVoice.addInstructions.mockImplementation(() => {
        throw new Error('instructions error');
      });

      expect(() => adapter.addInstructions('Be helpful')).toThrow(MastraAdapterError);
    });
  });

  describe('updateConfig', () => {
    it('delegates to voice.updateConfig', () => {
      adapter.updateConfig({ model: 'gpt-5.1-realtime' });
      expect(mockVoice.updateConfig).toHaveBeenCalledWith({ model: 'gpt-5.1-realtime' });
    });

    it('wraps errors as MastraAdapterError', () => {
      mockVoice.updateConfig.mockImplementation(() => {
        throw new Error('config error');
      });

      expect(() => adapter.updateConfig({})).toThrow(MastraAdapterError);
    });
  });
});
