import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../../apps/backend/src/modules/trpc/trpc.router';

export const trpc = createTRPCReact<AppRouter>();