import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RoutesModule } from './modules/routes/routes.module';
import { TrpcModule } from './modules/trpc/trpc.module';

@Module({
  imports: [PrismaModule, RoutesModule, TrpcModule],
})
export class AppModule {}