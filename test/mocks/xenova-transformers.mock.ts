export function pipeline(): Promise<never> {
  return Promise.reject(new Error('Embeddings are disabled in e2e'));
}
