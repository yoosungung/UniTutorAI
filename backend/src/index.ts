import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createTutorRoutes, type TutorRouteOptions } from './routes/tutor';
import type { Bindings } from './types/bindings';

export type { Bindings };
export type CreateAppOptions = TutorRouteOptions;

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono<{ Bindings: Bindings }>();

  app.use('*', cors());

  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      service: 'unitutor-backend',
      env: c.env?.ENVIRONMENT ?? 'production',
    });
  });

  app.route('/api/tutor', createTutorRoutes(options));

  return app;
}

const app = createApp();
export default app;
