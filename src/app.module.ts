import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule, CacheInterceptor } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-ioredis';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { QueueModule } from './core/queue/queue.module';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';

@Module({
  imports: [
    // Config Module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Throttler Module
    ThrottlerModule.forRoot([{ ttl: 60, limit: 10 }]),

    // Mongoose
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),

    // Global CacheModule with Redis
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: redisStore,
        host: config.get<string>('REDIS_HOST') || 'localhost',
        port: config.get<number>('REDIS_PORT') || 6379,
        password: config.get<string>('REDIS_PASSWORD') || undefined,
        ttl: 30,
      }),
    }),

    // Bull Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST') || 'localhost',
          port: +config.get('REDIS_PORT') || 6379,
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
      inject: [ConfigService],
    }),

    // App Modules
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    NotificationsModule,
    AnalyticsModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
  ],
})
export class AppModule {}
