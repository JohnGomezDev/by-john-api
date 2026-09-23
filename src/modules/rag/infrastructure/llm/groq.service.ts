import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq, { RateLimitError } from 'groq-sdk';
import {
  GROQ_MAX_RETRIES,
  GROQ_MODEL,
} from '../../application/constants/groq.constants';

@Injectable()
export class GroqService {
  private readonly client: Groq;

  constructor(private readonly configService: ConfigService) {
    this.client = new Groq({
      apiKey: this.configService.getOrThrow<string>('GROQ_API_KEY'),
    });
  }

  async generateAnswer(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    for (let attempt = 1; attempt <= GROQ_MAX_RETRIES; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0,
          max_tokens: 1024,
        });

        return response.choices[0]?.message?.content ?? '';
      } catch (error: unknown) {
        if (error instanceof RateLimitError && attempt < GROQ_MAX_RETRIES) {
          const retryAfter = error.headers.get('retry-after');
          const waitSecs = parseInt(retryAfter ?? String(attempt * 5), 10);
          await new Promise((resolve) => setTimeout(resolve, waitSecs * 1000));
          continue;
        }

        if (attempt === GROQ_MAX_RETRIES) {
          throw new ServiceUnavailableException(
            'El servicio de IA no está disponible en este momento',
          );
        }

        throw error;
      }
    }

    throw new ServiceUnavailableException(
      'El servicio de IA no está disponible en este momento',
    );
  }
}
