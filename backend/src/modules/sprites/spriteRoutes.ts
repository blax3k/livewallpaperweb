import { FastifyInstance } from "fastify";
import { renameSpriteById } from "./spriteService";
import { HttpStatus } from '../../utils/httpStatus';



export async function registerSceneRoutes(
  server: FastifyInstance,
): Promise<void> {

  server.patch<{ Params: { id: string }; Body: { name: string } }>(
    '/api/sprites/:id',
    async (req, reply) => {
      const renamed = await renameSpriteById(req.params.id, req.body.name);
      if (!renamed) {
        return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Sprite not found' });
      }

      return reply.status(HttpStatus.NO_CONTENT).send();
    },
  );
}