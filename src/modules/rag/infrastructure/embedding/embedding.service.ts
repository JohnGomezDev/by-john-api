import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';
import {
  E5_PASSAGE_PREFIX,
  E5_QUERY_PREFIX,
} from '../../application/constants/embedding.constants';

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private pipelineInstance: FeatureExtractionPipeline | null = null;

  async onModuleInit(): Promise<void> {
    try {
      this.pipelineInstance = await pipeline(
        'feature-extraction',
        'Xenova/multilingual-e5-small',
      );
      this.logger.log(
        'Modelo Xenova/multilingual-e5-small cargado correctamente',
      );
    } catch (error) {
      this.logger.error(
        'No se pudo inicializar el modelo de embeddings',
        error,
      );
      this.pipelineInstance = null;
    }
  }

  async embedDocument(text: string): Promise<number[]> {
    return this.embed(E5_PASSAGE_PREFIX + text);
  }

  async embedQuery(query: string): Promise<number[]> {
    return this.embed(E5_QUERY_PREFIX + query);
  }

  private async embed(text: string): Promise<number[]> {
    if (!this.pipelineInstance) {
      throw new ServiceUnavailableException(
        'El servicio de embeddings no está disponible',
      );
    }

    const output = await this.pipelineInstance(text, {
      pooling: 'mean',
      normalize: true,
    });

    return Array.from(output.data as ArrayLike<number>);
  }
}
