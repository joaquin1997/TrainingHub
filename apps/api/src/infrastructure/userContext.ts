import type { FastifyRequest } from 'fastify';

/** Only called behind the global authentication boundary. Never invent an owner. */
export async function resolveUserPublicId(request: FastifyRequest): Promise<string> {
  const sub = request.user?.sub;
  if (typeof sub !== 'string' || !sub) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
  return sub;
}
