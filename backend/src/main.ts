import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const helmet = require('helmet');
const compression = require('compression');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable('x-powered-by');
  expressApp.set('trust proxy', 1);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    })
  );
  app.use(compression());
  const rawOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  const allowedOrigins = rawOrigin === '*' ? '*' : rawOrigin.split(',').map((s) => s.trim());
  app.enableCors({
    origin: allowedOrigins,
    credentials: allowedOrigins !== '*'
  });

  const port = Number(configService.get<string>('BACKEND_PORT', '4000'));
  await app.listen(port);
}

bootstrap();
