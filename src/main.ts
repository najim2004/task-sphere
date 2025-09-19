import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { checkEnv } from './check-env';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  checkEnv();
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.use(cookieParser());
  app.enableCors({
    origin: ['http://localhost:3000', '*'],
    credentials: true,
  });
  await app.listen(parseInt(process.env.PORT ?? '3000', 10));
}
void bootstrap();
