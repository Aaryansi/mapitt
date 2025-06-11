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
      create: publicProcedure
        .input(
          z.object({
            name: z.string().min(1),
            description: z.string().optional(),
            waypoints: z
              .array(
                z.object({
                  lat: z.number(),
                  lng: z.number(),
                  name: z.string().optional(),
                })
              )
              .min(2),
          })
        )
        .mutation(async ({ input }) => {
          const route = await routesService.create(input);
          await routesService.calculateSegments(route.id);
          return route;
        }),

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

      get: publicProcedure
        .input(z.string())
        .query(async ({ input }) => {
          return routesService.findOne(input);
        }),

      update: publicProcedure
        .input(
          z.object({
            id: z.string(),
            data: z.object({
              name: z.string().optional(),
              description: z.string().optional(),
            }),
          })
        )
        .mutation(async ({ input }) => {
          return routesService.update(input.id, input.data);
        }),

      delete: publicProcedure
        .input(z.string())
        .mutation(async ({ input }) => {
          return routesService.delete(input);
        }),
    }),
  });
};

export type AppRouter = ReturnType<typeof createAppRouter>;