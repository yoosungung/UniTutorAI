import { Hono } from 'hono';
import { cors } from 'hono/cors';

export type Bindings = {
  ENVIRONMENT?: string;
  GEMINI_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'unitutor-backend',
    env: c.env?.ENVIRONMENT ?? 'production',
  });
});

export default app;
