jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn(),
}));

import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { pipeline } from '@xenova/transformers';
import {
  E5_PASSAGE_PREFIX,
  E5_QUERY_PREFIX,
  EMBEDDING_DIMENSION,
} from '../../application/constants/embedding.constants';
import { EmbeddingService } from './embedding.service';

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockPipelineInstance: jest.Mock;

  beforeEach(async () => {
    mockPipelineInstance = jest.fn();
    (pipeline as jest.Mock).mockResolvedValue(mockPipelineInstance);

    const module = await Test.createTestingModule({
      providers: [EmbeddingService],
    }).compile();

    service = module.get(EmbeddingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Pipeline should load the multilingual E5 small feature-extraction model on init
  it('should call pipeline with correct model on init', async () => {
    await service.onModuleInit();

    expect(pipeline).toHaveBeenCalledWith(
      'feature-extraction',
      'Xenova/multilingual-e5-small',
    );
  });

  // Document embeddings must use the E5 passage prefix and mean pooling
  it('should embed a document with the passage prefix', async () => {
    await service.onModuleInit();
    mockPipelineInstance.mockResolvedValue({
      data: new Float32Array(EMBEDDING_DIMENSION),
    });

    const result = await service.embedDocument('texto');

    expect(mockPipelineInstance).toHaveBeenCalledWith(
      `${E5_PASSAGE_PREFIX}texto`,
      {
        pooling: 'mean',
        normalize: true,
      },
    );
    expect(result).toHaveLength(EMBEDDING_DIMENSION);
    expect(result.every((value) => typeof value === 'number')).toBe(true);
  });

  // Query embeddings must use the E5 query prefix and mean pooling
  it('should embed a query with the query prefix', async () => {
    await service.onModuleInit();
    mockPipelineInstance.mockResolvedValue({
      data: new Float32Array(EMBEDDING_DIMENSION),
    });

    await service.embedQuery('mi pregunta');

    expect(mockPipelineInstance).toHaveBeenCalledWith(
      `${E5_QUERY_PREFIX}mi pregunta`,
      {
        pooling: 'mean',
        normalize: true,
      },
    );
  });

  // Uninitialized pipeline should surface as ServiceUnavailableException
  it('should throw ServiceUnavailableException if pipeline is not initialized', async () => {
    await expect(service.embedDocument('x')).rejects.toThrow(
      ServiceUnavailableException,
    );
    await expect(service.embedDocument('x')).rejects.toThrow(
      'El servicio de embeddings no está disponible',
    );
  });
});
