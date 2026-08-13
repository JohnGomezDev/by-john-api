/**
 * Encodes/decodes the opaque refresh token cookie value.
 * Format: "{id}.{secret}" — `id` is the whitelist row PK (fast indexed lookup),
 * `secret` is the random value whose bcrypt hash is stored in that row.
 */
export interface IParsedRefreshToken {
  id: string;
  secret: string;
}

export function buildRawRefreshToken(id: string, secret: string): string {
  return `${id}.${secret}`;
}

export function parseRawRefreshToken(
  raw: string | undefined | null,
): IParsedRefreshToken | null {
  if (!raw) {
    return null;
  }

  const [id, secret] = raw.split('.');
  if (!id || !secret) {
    return null;
  }

  return { id, secret };
}
