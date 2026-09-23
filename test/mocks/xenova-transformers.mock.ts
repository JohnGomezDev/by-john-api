const EMBEDDING_DIMENSION = 1024;

/**
 * `posts_chunks.embedding` is vector(1024). A zero vector lets indexing and
 * hybrid search run in e2e without loading the BGE-M3 model.
 */
export function pipeline(): Promise<() => Promise<{ data: Float32Array }>> {
  return Promise.resolve((): Promise<{ data: Float32Array }> =>
    Promise.resolve({ data: new Float32Array(EMBEDDING_DIMENSION) }),
  );
}
