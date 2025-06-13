import { z } from 'zod';
import { router, publicProcedure } from '../../lib/trpc';
import { RoutesService } from '../routes/routes.service';

export const createAppRouter = (routesService: RoutesService) => {
  return router({
    health: publicProcedure.query(() => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })),

    routes: router({
      list: publicProcedure
        .input(
          z.object({
            skip: z.number().default(0),
            take: z.number().default(10),
          })
        )
        .query(async ({ input }) => {
          return routesService.findAll(input);
        }),
    }),
  });
};

export type AppRouter = ReturnType<typeof createAppRouter>;