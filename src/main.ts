import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  console.log('serving http://localhost:3000/blogs using schema2');
  console.log('serving http://localhost:3000/users using schema1');
  await app.listen(3000);
}
bootstrap();
