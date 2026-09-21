---
name: Blog RAG Semántico
overview: Implementar un RAG de búsqueda híbrida (pgvector semántico + tsvector FTS fusionado con RRF) para el blog, usando BGE-M3 para embeddings locales y Groq `openai/gpt-oss-20b` como LLM, todo dentro de un nuevo módulo `rag` que sigue los patrones del proyecto.
todos:
  - id: docker-pgvector
    content: Crear el docker-compose del proyecto, con la imagen `pgvector/pgvector:pg17`. No cambiar ninguna otra configuración del servicio.
    status: completed
  - id: deps-install
    content: "Instalar exactamente estas 4 dependencias de producción: `groq-sdk`, `@xenova/transformers`, `@nestjs/event-emitter`, `remove-markdown`. Instalar también `@types/remove-markdown` como devDependency. Usar pnpm."
    status: completed
  - id: domain-post-chunk-entity
    content: "Crear `src/modules/rag/domain/entities/post-chunk.entity.ts`. Clase pura `PostChunk` sin decoradores ORM. Propiedades readonly en el constructor: `id: string`, `postId: string`, `chunkIndex: number`, `content: string`, `embedding: number[]`, `createdAt: Date`, `updatedAt: Date`. Método estático `PostChunk.create(props: { postId: string; chunkIndex: number; content: string; embedding: number[] }): PostChunk` que genera el id con `randomUUID()` y asigna `createdAt` y `updatedAt` a `new Date()`."
    status: completed
  - id: domain-post-chunk-repository
    content: "Crear `src/modules/rag/domain/repositories/post-chunk.repository.interface.ts`. Exportar la constante `POST_CHUNK_REPOSITORY = 'POST_CHUNK_REPOSITORY'`. Exportar la interfaz `IPostChunkRepository` con exactamente estos 3 métodos: (1) `replaceForPost(postId: string, chunks: PostChunk[]): Promise<void>` — reemplaza atómicamente todos los chunks de un post; (2) `deleteByPostId(postId: string): Promise<void>` — elimina todos los chunks de un post; (3) `hybridSearch(queryVector: number[], queryText: string, topK: number): Promise<IHybridSearchResult[]>` — búsqueda RRF. Exportar también la interfaz `IHybridSearchResult` con: `chunkId: string`, `postId: string`, `content: string`, `rrfScore: number`, `postTitle: string`, `postSlug: string`."
    status: completed
  - id: typeorm-entity
    content: "Crear `src/modules/rag/infrastructure/persistence/typeorm/post-chunk.typeorm-entity.ts`. Decorarlo con `@Entity('posts_chunks')`. Columnas: `id` (uuid, `@PrimaryColumn('uuid')`); `postId` (uuid, `@Column({ name: 'post_id', type: 'uuid' })`); `chunkIndex` (integer, `@Column({ name: 'chunk_index', type: 'integer' })`); `content` (text, `@Column({ type: 'text' })`); `embedding` (`@Column('vector', { length: 1024 })` — TypeORM 1.1 usa `length`, no `dimensions`); `createdAt` (`@CreateDateColumn({ name: 'created_at' })`); `updatedAt` (`@UpdateDateColumn({ name: 'updated_at' })`). NO agregar decoradores de índice — los índices se crean en la migración."
    status: completed
  - id: migration-generate-and-patch
    content: "PREREQUISITO: La entidad `PostChunkTypeOrmEntity` ya debe existir. Pasos: (1) Bajar la base de datos existente y recrearla vacía (drop + create). (2) Ejecutar `pnpm migration:run` para que el baseline cree todas las tablas excepto `posts_chunks`. (3) Ejecutar `pnpm migration:generate src/database/migrations/AddPostsChunks`. (4) Abrir el archivo generado. (5) Agregar como PRIMERA línea de `up`: `await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');`. (6) Verificar que la columna `embedding` aparece como `vector(1024)` en el `CREATE TABLE posts_chunks`. (7) Después del CREATE TABLE, agregar: `await queryRunner.query('CREATE INDEX idx_chunks_post_id ON posts_chunks(post_id)')` y `await queryRunner.query(\"CREATE INDEX idx_chunks_embedding ON posts_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)\")`. (8) En `down`, antes del DROP TABLE, agregar: `await queryRunner.query('DROP INDEX IF EXISTS idx_chunks_embedding')` y `await queryRunner.query('DROP INDEX IF EXISTS idx_chunks_post_id')`. (9) Al final del `down` agregar: `await queryRunner.query('DROP EXTENSION IF EXISTS vector')`."
    status: completed
  - id: embedding-service
    content: "Crear `src/modules/rag/infrastructure/embedding/embedding.service.ts`. Clase `EmbeddingService` con `@Injectable()` que implementa `OnModuleInit`. Campo privado `private pipelineInstance: any = null`. En `onModuleInit()`: importar dinámicamente `pipeline` de `@xenova/transformers` y llamar `pipeline('feature-extraction', 'Xenova/bge-m3')`, guardar el resultado en `this.pipelineInstance`. Método `async embedDocument(text: string): Promise<number[]>`: llama `this.pipelineInstance(text, { pooling: 'cls', normalize: true })`, retorna `Array.from(output.data) as number[]` (array de 1024 números). Método `async embedQuery(query: string): Promise<number[]>`: llama `embedDocument` con el texto `'Represent this sentence for searching relevant passages: ' + query`. Si `pipelineInstance` es null, lanzar `ServiceUnavailableException('El servicio de embeddings no está disponible')`."
    status: completed
  - id: groq-service
    content: "Crear `src/modules/rag/infrastructure/llm/groq.service.ts`. Exportar la constante `export const GROQ_MAX_RETRIES = 3`. Clase `GroqService` con `@Injectable()`. Constructor: `@Inject(ConfigService) private readonly configService: ConfigService`. Campo privado `private readonly client: Groq` instanciado en el constructor con `new Groq({ apiKey: this.configService.getOrThrow('GROQ_API_KEY') })`. Constante privada `private readonly MODEL = 'openai/gpt-oss-20b'`. Método `async generateAnswer(systemPrompt: string, userMessage: string): Promise<string>`: bucle `for (let attempt = 1; attempt <= GROQ_MAX_RETRIES; attempt++)`. En cada iteración: `try { const res = await this.client.chat.completions.create({ model: this.MODEL, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }], temperature: 0.3, max_tokens: 1024 }); return res.choices[0].message.content ?? ''; } catch (error) { if (error?.status === 429 && attempt < GROQ_MAX_RETRIES) { const waitSecs = parseInt(error.headers?.['retry-after'] ?? String(attempt * 5)); await new Promise(r => setTimeout(r, waitSecs * 1000)); continue; } if (attempt === GROQ_MAX_RETRIES) throw new ServiceUnavailableException('El servicio de IA no está disponible en este momento'); throw error; }`."
    status: completed
  - id: repository-impl
    content: "Crear `src/modules/rag/infrastructure/persistence/post-chunk.repository.impl.ts`. Clase `PostChunkRepositoryImpl` con `@Injectable()` que implementa `IPostChunkRepository`. Inyectar con `@InjectDataSource() private readonly dataSource: DataSource`. Método `replaceForPost(postId, chunks)`: usar `dataSource.transaction(async manager => { await manager.query('DELETE FROM posts_chunks WHERE post_id = $1', [postId]); if (chunks.length > 0) { const values = chunks.map((c, i) => `($${i*5+1}, $${i*5+2}, $${i*5+3}, $${i*5+4}, $${i*5+5}::vector)`).join(','); const params = chunks.flatMap(c => [c.id, c.postId, c.chunkIndex, c.content, JSON.stringify(c.embedding)]); await manager.query(`INSERT INTO posts_chunks(id, post_id, chunk_index, content, embedding) VALUES ${values}`, params); } })`. Método `deleteByPostId(postId)`: `await this.dataSource.query('DELETE FROM posts_chunks WHERE post_id = $1', [postId])`. Método `hybridSearch(queryVector, queryText, topK)`: ejecutar el SQL de la sección 6 del plan con `this.dataSource.query(sql, [JSON.stringify(queryVector), queryText, topK])`; mapear cada fila a `IHybridSearchResult` con `{ chunkId: row.chunk_id, postId: row.post_id, content: row.content, rrfScore: parseFloat(row.rrf_score), postTitle: row.title, postSlug: row.slug }`."
    status: completed
  - id: index-post-usecase
    content: "Crear `src/modules/rag/application/use-cases/index-post/index-post.use-case.ts`. Clase `IndexPostUseCase` con `@Injectable()`. Inyectar: `@Inject(POST_REPOSITORY) private readonly postRepository: IPostRepository` (importar POST_REPOSITORY del módulo blog), `@Inject(POST_CHUNK_REPOSITORY) private readonly chunkRepository: IPostChunkRepository`, `private readonly embeddingService: EmbeddingService`. Método `async execute(postId: string): Promise<void>`: (1) Buscar el post; si no existe, loguear con `Logger` y retornar sin error. (2) Llamar `removeMarkdown(post.content)` de `remove-markdown` para obtener texto plano. (3) Chunking: dividir por `\\n\\n`, filtrar párrafos vacíos, acumular chunks fusionando párrafos consecutivos mientras el acumulado sea < 200 chars; si un chunk supera 1500 chars, dividir en el último punto/signo de interrogación/exclamación antes del límite. Agregar los últimos 100 chars del chunk anterior como prefijo de cada chunk siguiente (overlap). (4) Para cada chunk, llamar `await this.embeddingService.embedDocument(chunk)`. (5) Construir `PostChunk.create({ postId, chunkIndex: i, content: chunk, embedding })` para cada uno. (6) Llamar `await this.chunkRepository.replaceForPost(postId, chunks)`. (7) Todo en try/catch: loguear el error con `Logger` y re-lanzar."
    status: completed
  - id: ask-blog-usecase
    content: "Crear `src/modules/rag/application/use-cases/ask-blog/ask-blog.use-case.ts`. Interfaz exportada `IAskBlogResult { answer: string; sources: Array<{ title: string; slug: string }> }`. Clase `AskBlogUseCase` con `@Injectable()`. Inyectar: `@Inject(POST_CHUNK_REPOSITORY) private readonly chunkRepository: IPostChunkRepository`, `private readonly embeddingService: EmbeddingService`, `private readonly groqService: GroqService`, `private readonly configService: ConfigService`. Método `async execute(query: string): Promise<IAskBlogResult>`: (1) Embed query: `const vector = await this.embeddingService.embedQuery(query)`. (2) `const topK = this.configService.get<number>('RAG_TOP_K', 5)`. (3) `const results = await this.chunkRepository.hybridSearch(vector, query, topK)`. (4) Si `results.length === 0`: retornar `{ answer: 'No encontré información sobre ese tema en el blog. Prueba con otras palabras clave.', sources: [] }` SIN llamar al LLM. (5) Construir el contexto: `results.map((r, i) => '[' + (i+1) + '] ' + r.postTitle + '\\n' + r.content).join('\\n\\n')`. (6) System prompt: `'Eres un asistente del blog. Responde ÚNICAMENTE basándote en los fragmentos de contexto proporcionados. Si la información no aparece en el contexto, dilo explícitamente. Cita los fragmentos relevantes con [número]. Responde en español.'`. (7) `const answer = await this.groqService.generateAnswer(systemPrompt, 'Pregunta: ' + query + '\\n\\nContexto:\\n' + context)`. (8) Deduplicar fuentes por postId, retornar `{ answer, sources: uniqueSources.map(r => ({ title: r.postTitle, slug: r.postSlug })) }`."
    status: completed
  - id: event-listener
    content: "Crear `src/modules/rag/infrastructure/events/post-indexing.listener.ts`. Clase `PostIndexingListener` con `@Injectable()`. Inyectar: `private readonly indexPostUseCase: IndexPostUseCase`, `@Inject(POST_CHUNK_REPOSITORY) private readonly chunkRepository: IPostChunkRepository`. Crear logger privado: `private readonly logger = new Logger(PostIndexingListener.name)`. Tres métodos: (1) `@OnEvent('post.published') async onPostPublished(payload: { postId: string }): Promise<void>` — llama `await this.indexPostUseCase.execute(payload.postId)` en try/catch, en catch loguear `this.logger.error(...)` sin re-lanzar. (2) `@OnEvent('post.updated') async onPostUpdated(payload: { postId: string }): Promise<void>` — idéntico al anterior. (3) `@OnEvent('post.unpublished') async onPostUnpublished(payload: { postId: string }): Promise<void>` — llama `await this.chunkRepository.deleteByPostId(payload.postId)` en try/catch, loguear en catch sin re-lanzar."
    status: completed
  - id: blog-event-publish
    content: "Modificar `src/modules/blog/application/use-cases/admin-publish-post/admin-publish-post.use-case.ts`. (1) Inyectar `private readonly eventEmitter: EventEmitter2` (importar de `@nestjs/event-emitter`). (2) En `execute()`, ANTES de llamar `post.publish()`, capturar `const wasAlreadyPublished = post.published`. (3) DESPUÉS de `this.postRepository.save(...)`, agregar: `if (!wasAlreadyPublished) { this.eventEmitter.emit('post.published', { postId: savedPost.id }); }`. Esto garantiza que el evento solo se emite en la transición draft→publicado, respetando la idempotencia del endpoint."
    status: completed
  - id: blog-event-update
    content: "Modificar `src/modules/blog/application/use-cases/admin-update-post/admin-update-post.use-case.ts`. (1) Inyectar `private readonly eventEmitter: EventEmitter2` (importar de `@nestjs/event-emitter`). (2) DESPUÉS de `this.postRepository.save(updated, tagIds)`, en el try block, agregar: `if (savedPost.published) { this.eventEmitter.emit('post.updated', { postId: savedPost.id }); }`. Solo re-indexar si el post ya está publicado."
    status: completed
  - id: blog-event-unpublish
    content: "Modificar `src/modules/blog/application/use-cases/admin-unpublish-post/admin-unpublish-post.use-case.ts`. (1) Inyectar `private readonly eventEmitter: EventEmitter2` (importar de `@nestjs/event-emitter`). (2) ANTES de llamar `post.unpublish()`, capturar `const wasPublished = post.published`. (3) DESPUÉS de `this.postRepository.save(...)`, agregar: `if (wasPublished) { this.eventEmitter.emit('post.unpublished', { postId: savedPost.id }); }`. Solo emitir si el post efectivamente estaba publicado antes de la llamada."
    status: completed
  - id: request-dto
    content: "Crear `src/modules/rag/infrastructure/http/dtos/request/ask-blog.request.dto.ts`. Clase `AskBlogRequestDto` con un campo: `query: string` decorado con `@ApiProperty({ description: 'Pregunta sobre el contenido del blog', example: '¿Cómo implementar autenticación JWT en NestJS?', minLength: 3, maxLength: 500 })`, `@IsString()`, `@IsNotEmpty()`, `@MinLength(3)`, `@MaxLength(500)`."
    status: completed
  - id: response-dto
    content: "Crear `src/modules/rag/infrastructure/http/dtos/response/ask-blog.response.dto.ts`. Clase anidada `PostSourceDto` con `@ApiProperty()` en: `title: string` y `slug: string`. Clase principal `AskBlogResponseDto` con `@ApiProperty()` en: `answer: string` y `sources: PostSourceDto[]`. Método estático `static fromDomain(result: IAskBlogResult): AskBlogResponseDto` que mapea el objeto de dominio al DTO."
    status: completed
  - id: controller
    content: "Crear `src/modules/rag/infrastructure/http/rag.controller.ts`. Clase `RagController` con `@ApiTags('RAG')` y `@Controller('rag')`. Constructor inyecta `AskBlogUseCase`. Endpoint: `@Post('ask')` sin ningún guard de autenticación (público). Decoradores Swagger: `@ApiOperation({ summary: 'Consulta el asistente del blog', description: 'Busca información en los posts publicados usando búsqueda semántica + full-text y genera una respuesta con IA.' })`, `@ApiBody({ type: AskBlogRequestDto })`, `@ApiOkResponse({ description: 'Respuesta generada exitosamente', type: AskBlogResponseDto })`, `@ApiBadRequestResponse({ description: 'Query inválida' })`, `@ApiServiceUnavailableResponse({ description: 'Servicio de IA no disponible' })`. El método llama `await this.askBlogUseCase.execute(dto.query)` y retorna `ApiResponseDto.ok(AskBlogResponseDto.fromDomain(result), 'Consulta procesada exitosamente')`."
    status: completed
  - id: rag-module
    content: "Crear `src/modules/rag/rag.module.ts`. Imports: `TypeOrmModule.forFeature([PostChunkTypeOrmEntity])`, `BlogModule`. Controllers: `[RagController]`. Providers: `{ provide: POST_CHUNK_REPOSITORY, useClass: PostChunkRepositoryImpl }`, `IndexPostUseCase`, `AskBlogUseCase`, `EmbeddingService`, `GroqService`, `PostIndexingListener`."
    status: completed
  - id: app-module
    content: "Modificar `src/app.module.ts`: (1) Agregar `EventEmitterModule.forRoot({ wildcard: false })` de `@nestjs/event-emitter` al array `imports`, ANTES de `DatabaseModule`. (2) Agregar `RagModule` al array `imports`, DESPUÉS de `BlogModule`."
    status: completed
  - id: env-example
    content: "Actualizar el archivo `env.example` (o `.env.example` si ese es el nombre) agregando estas 3 variables al final, en una sección comentada `# RAG / AI`: `GROQ_API_KEY=gsk_...` (obligatoria, clave de API de Groq), `RAG_TOP_K=5` (número de chunks a retornar, default 5), `RAG_CANDIDATE_LIMIT=50` (candidatos por pierna del RRF, default 50, actualmente hardcodeado en el SQL — documentar que debe coincidir con el LIMIT en hybridSearch)."
    status: completed
  - id: cursor-rule
    content: "Crear `.cursor/rules/rag.mdc` con frontmatter `description: 'Convenciones del módulo RAG'`, `globs: ['src/modules/rag/**']`, `alwaysApply: false`. Contenido con estas reglas: (1) Chunking: siempre strip Markdown con `remove-markdown` antes de chunkar. Tamaño objetivo 200–1500 chars con 100 chars de overlap. Respetar límites de párrafo. (2) Embedding: nunca instanciar el pipeline de `@xenova/transformers` fuera de `EmbeddingService`. Las queries de búsqueda siempre llevan el prefijo BGE-M3; los chunks indexados nunca. (3) LLM: toda llamada a Groq pasa por `GroqService.generateAnswer()`. El system prompt siempre delimita al LLM a responder solo con el contexto entregado. (4) Hybrid search: toda búsqueda vectorial+FTS usa la query RRF del repositorio. No hacer las búsquedas por separado fuera del repositorio. (5) Eventos: los nombres siguen el patrón `post.<acción>` (`post.published`, `post.updated`, `post.unpublished`). Payload siempre `{ postId: string }`. El evento `post.published` solo se emite en la transición draft→publicado. (6) Sin coincidencias: si `hybridSearch` retorna vacío, retornar respuesta predefinida sin llamar al LLM. Nunca pasar contexto vacío a Groq. (7) Errores del LLM: solo `GroqService` mapea errores de Groq. Los use cases reciben `ServiceUnavailableException` o la respuesta; nunca manejan errores de red de Groq directamente."
    status: completed
  - id: unit-test-embedding
    content: "Crear `src/modules/rag/infrastructure/embedding/embedding.service.spec.ts`. Al inicio: `jest.mock('@xenova/transformers', () => ({ pipeline: jest.fn() }))`. Importar `pipeline` de `@xenova/transformers` para manipular el mock. En `beforeEach`: crear `mockPipelineInstance = jest.fn()` y configurar `(pipeline as jest.Mock).mockResolvedValue(mockPipelineInstance)`. Crear el servicio con `Test.createTestingModule`. Casos: (1) 'should call pipeline with correct model on init' — llamar `onModuleInit()`, verificar `expect(pipeline).toHaveBeenCalledWith('feature-extraction', 'Xenova/bge-m3')`. (2) 'should embed a document without instruction prefix' — `mockPipelineInstance.mockResolvedValue({ data: new Float32Array(1024) })`, llamar `embedDocument('texto')`, verificar que `mockPipelineInstance` fue llamado con `'texto'` y que el resultado es `number[]` de longitud 1024. (3) 'should embed a query with BGE-M3 instruction prefix' — igual que (2) pero llamar `embedQuery('mi pregunta')`, verificar que `mockPipelineInstance` fue llamado con un string que inicia con `'Represent this sentence for searching relevant passages: '`. (4) 'should throw ServiceUnavailableException if pipeline is not initialized' — NO llamar `onModuleInit()`, llamar `embedDocument('x')`, esperar `ServiceUnavailableException`."
    status: pending
  - id: unit-test-groq
    content: "Crear `src/modules/rag/infrastructure/llm/groq.service.spec.ts`. Al inicio: `jest.mock('groq-sdk', () => ({ default: jest.fn().mockImplementation(() => ({ chat: { completions: { create: jest.fn() } } })) }))`. En `beforeEach`: usar `Test.createTestingModule` con `GroqService` y mock de `ConfigService` que retorna `'test-key'` para `getOrThrow('GROQ_API_KEY')`. Capturar `completionsMock = service['client'].chat.completions.create as jest.Mock`. Casos: (1) 'should call chat.completions.create with the correct model and messages' — mock retorna `{ choices: [{ message: { content: 'respuesta' } }] }`, llamar `generateAnswer('system', 'user')`, verificar que `completionsMock` fue llamado con `{ model: 'openai/gpt-oss-20b', messages: [{ role: 'system', content: 'system' }, { role: 'user', content: 'user' }], temperature: 0.3, max_tokens: 1024 }`. (2) 'should retry once on 429 and succeed on second attempt' — mock: primer llamado lanza `{ status: 429, headers: { 'retry-after': '1' } }`, segundo llamado retorna la respuesta; usar `jest.useFakeTimers()` para no esperar. Verificar que `completionsMock` se llamó exactamente 2 veces. (3) 'should throw ServiceUnavailableException after exhausting all retries' — mock siempre lanza 429 (GROQ_MAX_RETRIES veces), verificar que se lanza `ServiceUnavailableException`. (4) 'should rethrow non-429 errors immediately without retrying' — mock lanza `new Error('network error')`, verificar que se re-lanza el mismo error y que `completionsMock` se llamó solo 1 vez."
    status: pending
  - id: unit-test-index
    content: "Crear `src/modules/rag/application/use-cases/index-post/index-post.use-case.spec.ts`. Estructura `describe('IndexPostUseCase')` con mocks de `IPostRepository`, `IPostChunkRepository`, `EmbeddingService` vía `useValue` en `Test.createTestingModule`. `embeddingService` mock: `{ embedDocument: jest.fn().mockResolvedValue(new Array(1024).fill(0.1)) }`. `postRepository` mock: `{ findById: jest.fn() }`. `chunkRepository` mock: `{ replaceForPost: jest.fn().mockResolvedValue(undefined) }`. Casos: (1) 'should chunk, embed, and persist chunks for a post' — post con `content: '# Título\\n\\nPárrafo uno con suficiente contenido para ser un chunk válido.\\n\\nPárrafo dos también suficientemente largo.'`, verificar que `embeddingService.embedDocument` se llamó al menos 1 vez y que `chunkRepository.replaceForPost` se llamó con `(postId, expect.arrayContaining([expect.objectContaining({ postId, embedding: expect.any(Array) })]))`. (2) 'should strip Markdown before embedding' — post con `content: '# Heading\\n\\n**Bold text** and [link](http://example.com) with ![img](http://img.png)'`, verificar que `embeddingService.embedDocument` NO fue llamado con ningún string que contenga `#`, `**`, `[`, `!['`. (3) 'should create exactly one chunk for very short content' — post con `content: 'Contenido corto'`, verificar que `chunkRepository.replaceForPost` fue llamado con array de longitud 1. (4) 'should log and return without error if post is not found' — `postRepository.findById` retorna `null`, verificar que `chunkRepository.replaceForPost` NO se llamó y el método resolvió sin lanzar. (5) 'should rethrow errors from the chunk repository' — `chunkRepository.replaceForPost` lanza `new Error('db error')`, esperar que el use case lo re-lance."
    status: pending
  - id: unit-test-ask
    content: "Crear `src/modules/rag/application/use-cases/ask-blog/ask-blog.use-case.spec.ts`. Estructura `describe('AskBlogUseCase')` con mocks de `IPostChunkRepository`, `EmbeddingService`, `GroqService`, `ConfigService` vía `useValue`. `embeddingService` mock: `{ embedQuery: jest.fn().mockResolvedValue(new Array(1024).fill(0.1)) }`. `groqService` mock: `{ generateAnswer: jest.fn().mockResolvedValue('Esta es la respuesta') }`. `chunkRepository` mock: `{ hybridSearch: jest.fn() }`. `configService` mock: `{ get: jest.fn().mockReturnValue(5) }`. Casos: (1) 'should embed the query with instruction prefix, search, call LLM, and return answer with sources' — `hybridSearch` retorna 2 resultados con `postId` distintos, verificar: `embeddingService.embedQuery` llamado con la query, `chunkRepository.hybridSearch` llamado con el vector, `groqService.generateAnswer` llamado 1 vez, y el resultado tiene `answer: 'Esta es la respuesta'` y `sources` con 2 elementos con `title` y `slug`. (2) 'should return predefined no-match answer and NOT call LLM when hybridSearch returns empty array' — `hybridSearch` retorna `[]`, verificar que `groqService.generateAnswer` NO se llamó y `result.answer` es el string predefinido de sin coincidencias y `result.sources` es `[]`. (3) 'should propagate ServiceUnavailableException from GroqService without wrapping it' — `groqService.generateAnswer` lanza `new ServiceUnavailableException('...')`, `hybridSearch` retorna 1 resultado, esperar que `execute()` lance exactamente esa `ServiceUnavailableException`."
    status: pending
  - id: readme-update
    content: "Actualizar `README.md` con estos cambios precisos: (1) En la tabla de **Requisitos**, reemplazar la fila de PostgreSQL por `pgvector/pgvector:pg17 (Docker)` con descripción `PostgreSQL 17 con extensión pgvector incluida`. (2) En la tabla de **Stack**, agregar dos filas: `Xenova/bge-m3 (local, ONNX)` con `Embeddings para búsqueda semántica (1024 dims)` y `Groq openai/gpt-oss-20b` con `LLM para generación de respuestas RAG`. (3) En la tabla de **Variables de entorno**, agregar `GROQ_API_KEY` con descripción `Clave de API de Groq (obligatoria para el módulo RAG)` y `RAG_TOP_K` con `Número de chunks recuperados por búsqueda (default: 5)`. (4) Agregar una nueva sección `## Asistente del Blog (RAG)` después de la sección de Scripts con este contenido: describir que el sistema indexa automáticamente los posts al publicarlos usando embeddings BGE-M3 y los almacena en `posts_chunks` con pgvector; la búsqueda combina semántica (HNSW cosine) + full-text (tsvector GIN) con Reciprocal Rank Fusion; el endpoint `POST /api/rag/ask` con body `{ \"query\": string }` retorna `{ answer: string, sources: [{ title, slug }] }` y es público."
    status: pending
isProject: false
---

# Plan: Blog RAG con Búsqueda Híbrida (Semántica + FTS + RRF)

## Decisiones técnicas clave

- **Modelo Groq**: `openai/gpt-oss-20b` vía `groq-sdk`
- **Embeddings**: `@xenova/transformers` + `Xenova/bge-m3` (1024 dims, multilingüe, excelente en español)
- **pgvector**: Soporte nativo en TypeORM ^1.x — `@Column('vector', { dimensions: 1024 })`
- **Búsqueda**: HNSW (cosine) + GIN (tsvector) → RRF (k=60, 50 candidatos por pierna)
- **Indexación**: Auto vía `@nestjs/event-emitter`, eventual (asíncrona, no transaccional)
- **Top K**: 5 chunks por búsqueda (`RAG_TOP_K=5`)
- **Markdown stripping**: librería `remove-markdown` (conserva alt text de imágenes, elimina URLs)
- **Endpoint**: `POST /api/rag/ask` público, respuesta incluye `answer` + `sources[]`

## 1. Docker Compose

Cambiar imagen de `postgres:17.2` a `pgvector/pgvector:pg17` para incluir la extensión vector.

## 2. Migración — nueva (no modificar la baseline)

Crear la entidad `PostChunkTypeOrmEntity` primero. Luego:
1. Drop + recreate DB vacía
2. `pnpm migration:run` → baseline crea todas las tablas existentes
3. `pnpm migration:generate src/database/migrations/AddPostsChunks` → TypeORM detecta solo `posts_chunks`
4. Parchear el archivo generado manualmente:
   - Agregar `CREATE EXTENSION IF NOT EXISTS vector` como primera sentencia del `up`
   - Agregar índice `idx_chunks_post_id` e índice HNSW `idx_chunks_embedding` después del CREATE TABLE
   - Agregar `DROP EXTENSION IF EXISTS vector` al final del `down`
   - Agregar DROP INDEX antes del DROP TABLE en `down`

La baseline **no se toca**. La extensión vive en la nueva migración, antes de la tabla que la necesita.

### Tabla `posts_chunks`
```sql
CREATE TABLE posts_chunks (
  id           UUID          PRIMARY KEY,
  post_id      UUID          NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  chunk_index  INTEGER       NOT NULL,
  content      TEXT          NOT NULL,
  embedding    vector(1024)  NOT NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP     NOT NULL DEFAULT now()
);
CREATE INDEX idx_chunks_post_id ON posts_chunks(post_id);
CREATE INDEX idx_chunks_embedding ON posts_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

`ON DELETE CASCADE` asegura que al borrar un post, sus chunks se eliminan automáticamente sin listener.

## 3. Nuevas dependencias

```
groq-sdk
@xenova/transformers
@nestjs/event-emitter
remove-markdown          (+ @types/remove-markdown como devDependency)
```

## 4. Estructura del módulo `rag`

```
src/modules/rag/
  domain/
    entities/post-chunk.entity.ts
    repositories/post-chunk.repository.interface.ts
  application/
    use-cases/
      ask-blog/ask-blog.use-case.ts         ← búsqueda híbrida + LLM
      index-post/index-post.use-case.ts     ← chunk + embed + guardar
  infrastructure/
    persistence/
      typeorm/post-chunk.typeorm-entity.ts
      post-chunk.repository.impl.ts         ← raw SQL para vector ops + RRF
    http/
      dtos/request/ask-blog.request.dto.ts
      dtos/response/ask-blog.response.dto.ts
      rag.controller.ts
    embedding/embedding.service.ts          ← Xenova/bge-m3, lazy load
    llm/groq.service.ts                     ← openai/gpt-oss-20b + retry
    events/post-indexing.listener.ts        ← @OnEvent handlers
  rag.module.ts
```

## 5. Flujo de indexación (event-driven, eventual)

```mermaid
flowchart TD
    AdminPublishPost["AdminPublishPostUseCase"] -->|"wasAlreadyPublished === false\nemit post.published"| EventEmitter
    AdminUpdatePost["AdminUpdatePostUseCase"] -->|"savedPost.published === true\nemit post.updated"| EventEmitter
    AdminUnpublishPost["AdminUnpublishPostUseCase"] -->|"wasPublished === true\nemit post.unpublished"| EventEmitter
    EventEmitter --> Listener["PostIndexingListener"]
    Listener -->|"post.published / post.updated"| IndexPostUseCase["IndexPostUseCase"]
    Listener -->|"post.unpublished"| DeleteChunks["chunkRepository.deleteByPostId()"]
    IndexPostUseCase --> StripMarkdown["1. removeMarkdown(content) — remove-markdown"]
    StripMarkdown --> Chunk["2. chunking por párrafo\n200–1500 chars, 100 chars overlap"]
    Chunk --> Embed["3. embeddingService.embedDocument()"]
    Embed --> Save["4. chunkRepository.replaceForPost()"]
```

**Idempotencia de publicación**: `post.publish()` es idempotente (jsc en `post.entity.ts`), por eso se captura `wasAlreadyPublished = post.published` antes de llamarlo. El evento solo se emite si hubo transición draft→publicado.

**Sin transacción con la acción del post**: la indexación es eventual. Si falla, el post sigue publicado; el admin puede re-indexar. No se bloquea la respuesta del endpoint de publicación.

## 6. Búsqueda híbrida con RRF

Ejecutado en `PostChunkRepositoryImpl.hybridSearch()` vía `DataSource.query()`:

```sql
WITH
semantic AS (
  SELECT pc.id chunk_id, pc.post_id, pc.content,
    ROW_NUMBER() OVER (ORDER BY pc.embedding <=> $1::vector) rank
  FROM posts_chunks pc
  ORDER BY pc.embedding <=> $1::vector
  LIMIT 50
),
fts AS (
  SELECT pc.id chunk_id, pc.post_id, pc.content,
    ROW_NUMBER() OVER (
      ORDER BY ts_rank(p.search_vector, plainto_tsquery('spanish', $2)) DESC
    ) rank
  FROM posts_chunks pc
  JOIN posts p ON pc.post_id = p.id
  WHERE p.search_vector @@ plainto_tsquery('spanish', $2)
    AND p.published = true
  LIMIT 50
),
rrf AS (
  SELECT
    COALESCE(s.chunk_id, f.chunk_id) chunk_id,
    COALESCE(s.post_id,  f.post_id)  post_id,
    COALESCE(s.content,  f.content)  content,
    COALESCE(1.0/(60+s.rank), 0.0) + COALESCE(1.0/(60+f.rank), 0.0) rrf_score
  FROM semantic s FULL OUTER JOIN fts f ON s.chunk_id = f.chunk_id
)
SELECT r.chunk_id, r.post_id, r.content, r.rrf_score, p.title, p.slug
FROM rrf r
JOIN posts p ON r.post_id = p.id
WHERE p.published = true
ORDER BY r.rrf_score DESC
LIMIT $3
```

Parámetros: `$1` = vector (serializado como JSON string `[0.1, 0.2, ...]`), `$2` = query text, `$3` = topK (5).

## 7. AskBlogUseCase — lógica completa

```
1. embedQuery(query) → vector de 1024 dims (con prefijo BGE-M3)
2. hybridSearch(vector, query, topK=5) → IHybridSearchResult[]
3. Si results.length === 0 → retornar respuesta predefinida SIN llamar al LLM
4. Construir contexto numerado con título + contenido de cada chunk
5. System prompt: limitar al LLM a responder solo con el contexto
6. groqService.generateAnswer(systemPrompt, query + contexto)
7. Deduplicar fuentes por postId
8. Retornar { answer, sources: [{ title, slug }] }
```

**Sin coincidencias**: retornar `{ answer: 'No encontré información sobre ese tema en el blog. Prueba con otras palabras clave.', sources: [] }` directamente. Es UX, no un error; no se lanza excepción.

## 8. GroqService — retry para rate limit

```typescript
export const GROQ_MAX_RETRIES = 3;

// En generateAnswer():
for (let attempt = 1; attempt <= GROQ_MAX_RETRIES; attempt++) {
  try {
    return await this.client.chat.completions.create({ ... });
  } catch (error) {
    if (error?.status === 429 && attempt < GROQ_MAX_RETRIES) {
      const waitSecs = parseInt(error.headers?.['retry-after'] ?? String(attempt * 5));
      await new Promise(r => setTimeout(r, waitSecs * 1000));
      continue;
    }
    if (attempt === GROQ_MAX_RETRIES) {
      throw new ServiceUnavailableException('El servicio de IA no está disponible en este momento');
    }
    throw error; // errores no-429: re-lanzar inmediatamente
  }
}
```

## 9. EmbeddingService — lazy loading y prefijo BGE-M3

```typescript
// Prefijo obligatorio para queries (no para chunks):
const QUERY_PREFIX = 'Represent this sentence for searching relevant passages: ';

async embedQuery(query: string): Promise<number[]> {
  return this.embedDocument(QUERY_PREFIX + query);
}
```

El pipeline se inicializa en `onModuleInit()`. Primera carga descarga ~570MB, se cachea automáticamente.

## 10. Wiring de módulos

- `AppModule`: `EventEmitterModule.forRoot({ wildcard: false })` antes de `DatabaseModule`; `RagModule` después de `BlogModule`
- `RagModule`: importa `BlogModule` (para acceder a `POST_REPOSITORY` y `PostTypeOrmEntity`)
- `BlogModule`: ya exporta `POST_REPOSITORY` y `TypeOrmModule` — no requiere cambios en el módulo

## 11. Cursor Rule — `.cursor/rules/rag.mdc`

`globs: src/modules/rag/**` — cubre convenciones de: chunking, embedding (prefijo de query), LLM (solo via GroqService), hybrid search (solo via repositorio), eventos (patrón `post.<acción>`, idempotencia en publish), no-match sin LLM, mapeo de errores.

## 12. Unit Tests

### `embedding.service.spec.ts`
- `jest.mock('@xenova/transformers')` con factory
- Init del pipeline con modelo correcto
- Embed de chunk sin prefijo
- Embed de query con prefijo BGE-M3
- `ServiceUnavailableException` si pipeline no inicializado

### `groq.service.spec.ts`
- `jest.mock('groq-sdk')` con factory
- Llamada correcta al modelo con parámetros exactos
- Retry exitoso en 429 (2 intentos)
- `ServiceUnavailableException` tras `GROQ_MAX_RETRIES` fallos
- Re-lanzamiento inmediato de errores no-429

### `index-post.use-case.spec.ts`
- Flujo happy path: strip + chunk + embed + replaceForPost
- Strip de Markdown verificado (sin `#`, `**`, `![]()`)
- Contenido corto → 1 chunk
- Post no encontrado → log + return sin error
- Re-throw de error del repositorio

### `ask-blog.use-case.spec.ts`
- Flujo happy path: embed query + search + LLM + answer + sources deduplicados
- Sin resultados → respuesta predefinida, LLM NO llamado
- `ServiceUnavailableException` de GroqService propagada sin envolver

## 13. Actualización de README.md

- **Requisitos**: PostgreSQL → `pgvector/pgvector:pg17` vía Docker
- **Stack**: agregar `Xenova/bge-m3` y `Groq openai/gpt-oss-20b`
- **Variables de entorno**: agregar `GROQ_API_KEY` y `RAG_TOP_K`
- **Nueva sección "Asistente del Blog (RAG)"**: endpoint, body, respuesta, flujo de indexación automática

## Variables de entorno necesarias

```env
# RAG / AI
GROQ_API_KEY=gsk_...        # obligatoria
RAG_TOP_K=5                 # chunks retornados (default: 5)
RAG_CANDIDATE_LIMIT=50      # candidatos por pierna RRF (documentar, hardcodeado en SQL)
```
