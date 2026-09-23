jest.mock('groq-sdk', () => {
  const actual = jest.requireActual<typeof import('groq-sdk')>('groq-sdk');
  return {
    __esModule: true,
    ...actual,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { APIError } from 'groq-sdk';
import {
  GROQ_MAX_RETRIES,
  GROQ_MODEL,
} from '../../application/constants/groq.constants';
import { GroqService } from './groq.service';

describe('GroqService', () => {
  let service: GroqService;
  let completionsMock: jest.Mock;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GroqService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-key'),
          },
        },
      ],
    }).compile();

    service = module.get(GroqService);
    completionsMock = (
      service as unknown as {
        client: { chat: { completions: { create: jest.Mock } } };
      }
    ).client.chat.completions.create;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  function rateLimitError(retryAfter = '1'): APIError {
    return APIError.generate(
      429,
      { error: { message: 'rate limit' } },
      'Rate limit exceeded',
      new Headers({ 'retry-after': retryAfter }),
    );
  }

  // Successful call should use the configured model and message roles
  it('should call chat.completions.create with the correct model and messages', async () => {
    completionsMock.mockResolvedValue({
      choices: [{ message: { content: 'respuesta' } }],
    });

    const result = await service.generateAnswer('system', 'user');

    expect(result).toBe('respuesta');
    expect(completionsMock).toHaveBeenCalledWith({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'system' },
        { role: 'user', content: 'user' },
      ],
      temperature: 0,
      max_tokens: 1024,
    });
  });

  // A single 429 should be retried and succeed on the next attempt
  it('should retry once on 429 and succeed on second attempt', async () => {
    jest.useFakeTimers();
    completionsMock
      .mockRejectedValueOnce(rateLimitError('1'))
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'respuesta' } }],
      });

    const promise = service.generateAnswer('system', 'user');
    await jest.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toBe('respuesta');
    expect(completionsMock).toHaveBeenCalledTimes(2);
  });

  // Exhausting retries on 429 should map to ServiceUnavailableException
  it('should throw ServiceUnavailableException after exhausting all retries', async () => {
    jest.useFakeTimers();
    completionsMock.mockRejectedValue(rateLimitError('1'));

    const promise = service.generateAnswer('system', 'user');
    const expectation = expect(promise).rejects.toThrow(
      ServiceUnavailableException,
    );

    for (let i = 0; i < GROQ_MAX_RETRIES - 1; i++) {
      await jest.advanceTimersByTimeAsync(1000);
    }

    await expectation;
    expect(completionsMock).toHaveBeenCalledTimes(GROQ_MAX_RETRIES);
  });

  // Non-429 failures must not be retried
  it('should rethrow non-429 errors immediately without retrying', async () => {
    const networkError = new Error('network error');
    completionsMock.mockRejectedValue(networkError);

    await expect(service.generateAnswer('system', 'user')).rejects.toThrow(
      networkError,
    );
    expect(completionsMock).toHaveBeenCalledTimes(1);
  });
});
