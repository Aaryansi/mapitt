import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { createAppRouter } from './modules/trpc/trpc.router';
import { RoutesService } from './modules/routes/routes.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : 'http://localhost:3000',
    credentials: true,
  }));

  // Get services
  const routesService = app.get(RoutesService);
  
  // Create tRPC router
  const appRouter = createAppRouter(routesService);
  
  // Apply tRPC middleware
  app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: appRouter,
    })
  );
  
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`tRPC endpoint: http://localhost:${port}/trpc`);
}

bootstrap();