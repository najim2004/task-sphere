import { Logger } from '@nestjs/common';

export function checkEnv() {
  const requiredEnv = ['MONGO_URI', 'REDIS_HOST', 'REDIS_PORT', 'JWT_SECRET'];

  const missingEnv = requiredEnv.filter((env) => !process.env[env]);

  if (missingEnv.length > 0) {
    Logger.error(`Missing environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
  }
}
