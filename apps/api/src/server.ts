import { createApp } from './app.js';

const start = async () => {
  const server = createApp();

  try {
    await server.listen({
      host: process.env.HOST ?? '0.0.0.0',
      port: Number(process.env.PORT ?? 3000),
    });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

void start();
