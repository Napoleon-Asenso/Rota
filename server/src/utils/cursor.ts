import { z } from 'zod';

const CursorPayloadSchema = z.object({
  createdAt: z.string(),
  id: z.string()
});

export type CursorPayload = z.infer<typeof CursorPayloadSchema>;

export function encodeCursor(payload: { createdAt: Date | string; id: string }): string {
  const iso = payload.createdAt instanceof Date ? payload.createdAt.toISOString() : payload.createdAt;
  const raw = JSON.stringify({ createdAt: iso, id: payload.id });
  return Buffer.from(raw, 'utf8').toString('base64');
}

export function decodeCursor(cursorString: string): CursorPayload | null {
  try {
    const isUrlSafe = cursorString.includes('-') || cursorString.includes('_');
    const raw = Buffer.from(cursorString, isUrlSafe ? 'base64url' : 'base64').toString('utf8');
    const parsed = JSON.parse(raw);
    const result = CursorPayloadSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
