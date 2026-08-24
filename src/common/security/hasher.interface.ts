export const HASHER = 'HASHER';

export interface IHasher {
  hash(raw: string): Promise<string>;
  compare(raw: string, hash: string): Promise<boolean>;
}
