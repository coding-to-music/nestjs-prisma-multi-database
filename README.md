# nestjs-prisma-multi-database

# 🚀 Javascript full-stack 🚀

https://github.com/coding-to-music/nestjs-prisma-multi-database

https://nestjs-prisma-multi-database.vercel.app

https://nestjs-prisma-multi-database.vercel.app/api/auth

By Sagar Lama

Mar 12 2022

https://towardsdev.com/multiple-database-connections-in-prisma-b252782b2646

https://github.com/sagarPakhrin/prisma-multidatabase-demo

## Environment Values

```java
DATABASE_URL: Copy this value directly from your .env file
GITHUB_ID: Set this to the Client ID of the GitHub OAuth app you just created
GITHUB_SECRET: Set this to the Client Secret of the GitHub OAuth app you just created
NEXTAUTH_URL: Set this to the Authorization Callback URL of the GitHub OAuth app you just created
```

## GitHub

```java
git init
git add .
git remote remove origin
git commit -m "first commit"
git branch -M main
git remote add origin git@github.com:coding-to-music/nestjs-prisma-multi-database.git
git push -u origin main
vercel --prod --confirm
```

# Prisma multi database example

# Setup

```bash
git clone https://github.com/sagarPakhrin/prisma-multidatabase-demo.git

cd prisma-multidatabase-demo

cp .env.example .env

npm i

docker-compose up -d

npm run start:dev

```

# Multiple Database connections in Prisma

By Sagar Lama

Mar 12 2022

4 min read

https://towardsdev.com/multiple-database-connections-in-prisma-b252782b2646

https://github.com/sagarPakhrin/prisma-multidatabase-demo

image taken from https://www.prisma.io/blog/prisma-migrate-dx-primitives

If you come across a situation where you have two databases and need to connect to the two databases with Prisma, here’s how to do it.

TLDR: Talk is cheap, show me the code

https://github.com/sagarPakhrin/prisma-multidatabase-demo

## Why do you need multiple database connections?

You don’t typically need to use multiple databases. If you’re not sure why you probably don’t need it.

But you could be in a situation where you have an old database that’s maintained by a different API and you’re using a separate database for your new API and you need to use both databases, you can set up Prisma to do so.

## Let’s get started

The files/folder naming conventions used in the post is not an ideal way, it’s done to keep things simple.

### Start a new nestjs project

```java
nest new prisma-multidatabase-demo
cd prisma-multidatabase-demo
```

### Install and Initialize Prisma

```java
npm install prisma --save-dev
npx prisma init
```

Once you run the init command, a Prisma folder with schema.prisma will be generated, and DATABASE_URL with default value will be added to the .env

Your project should look like this.

Create MySQL container (image)

```java
version: '3.8'
services:
  mysql:
    image: mysql:8
    ports:
      - '3306:3306'
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - ./tmp:/var/lib/mysql
```

Add variables to .env

```java
MYSQL_ROOT_PASSWORD=prisma
MYSQL_DATABASE=prisma
MYSQL_USER=prisma
MYSQL_PASSWORD=prisma
DATABASE_URL=mysql://prisma:prisma@localhost:3306/prisma
```

Prisma needs to have a shadow database for it to be able to run migrations safely so let’s create a shadow database and a second database to demonstrate multiple database connections with Prisma.

### Create a `db/init.sql`

```java
CREATE DATABASE IF NOT EXISTS `prisma-shadow`;
GRANT ALL ON `prisma-shadow`._ TO 'prisma'@'%';
CREATE DATABASE IF NOT EXISTS `prisma2`;
GRANT ALL ON `prisma2`._ TO 'prisma'@'%';
```

This will create two databases, and grant all privileges for our user prisma

Let’s update docker-compose.yml to set db/init.sql as entry point for our MySQL container. In your compose file, replace the previous volumes with

```java
volumes:
      - ./tmp:/var/lib/mysql
      - ./db:/docker-entrypoint-initdb.d
```

Run the container with `docker-compose up -d` and start the development server with `npm run start:dev`

### Set the first database connection

```java
#prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider          = "mysql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
model User {
  id   Int    @id @default(autoincrement())
  name String
}
```

To keep things simple we will only create a User model with id and name. Now let’s add a script to run the migration in our package.json

```java
“migrate”: “npx prisma migrate dev”
```

And run the command `npm run migrate` This will generate a Prisma client inside `node_modules/.prisma/client` , generate migration files and create appropriate tables in our prisma database

Note: The `node_modules/.prisma/client/schema.prismafile` should be the same as `prisma/schema.prisma`

### Install and generate Prisma Client

```java
npm install @prisma/client
```

### Create `prisma.service.ts` in src folder

```java
import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit {

  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
```

### Update the API to get the list of users

```java
// app.service.ts
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers(): Promise<User[]> {
    return this.prisma.user.findMany();
  }
}


// app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { User } from '@prisma/client';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/users')
  getUsers(): Promise<User[]> {
    return this.appService.getUsers();
  }
}


// app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
```

You can create a route to add users and once you do that, you will get the list of the users.

### Set the second database connection

Create a schema.prisma inside a different folder

```java
// prisma2/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/@internal/prisma/client"
}

datasource db {
  provider          = "mysql"
  url               = env("BLOG_DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}

model Blog {
  id    Int    @id @default(autoincrement())
  title String
}
```

For the second connection, the output directory for the client needs to point to a different directory. We will place it inside node_modules/@internal/prisma/client

## Generate migrations

Let’s add a new command in package.json to generate migrations for the second schema file

```java
"schema2:migrate": "npx prisma migrate dev --schema ./prisma2/schema.prisma"
```

Add `BLOG_DATABASE_URL` to .env file

```java
BLOG_DATABASE_URL=mysql://prisma:prisma@localhost:3306/prisma2
```

Now when you run npm run `schema2:migrate` a new folder `@internal/prisma/client` will be generated.

If you have an old database with data in it, you don’t need to generate migrations files. Instead of running `migrate dev`, you can generate Prisma client by running

```java
npx prisma generate --schema ./prisma2/schema.prisma
```

### Create Prisma service

We need to create a separate prisma.service that will connect with the second database. This service will be the same but the PrismaClient will be imported from the newly generated @internal/prisma/client instead of the default@prisma/client

```java
// prisma2.service.ts

import { PrismaClient } from '@internal/prisma/client';
import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
```

Now let’s update the API to list the blogs using the second database connection

```java
// app.service.ts
import { Blog } from '@internal/prisma/client';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { PrismaService as PrismaService2 } from './prisma2.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prisma2: PrismaService2,
  ) {}

  async getUsers(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async getBlogs(): Promise<Blog[]> {
    return this.prisma2.blog.findMany();
  }
}


// app.controller.ts
import { Blog } from '@internal/prisma/client';
import { Controller, Get } from '@nestjs/common';
import { User } from '@prisma/client';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/users')
  getUsers(): Promise<User[]> {
    return this.appService.getUsers();
  }

  @Get('/blogs')
  getBlogs(): Promise<Blog[]> {
    return this.appService.getBlogs();
  }
}


// app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { PrismaService as PrismaService2 } from './prisma2.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, PrismaService, PrismaService2],
})
export class AppModule {}
```

And there you have it. You now have connections to both databases with Prisma.

### TIP:

If you’re running CI pipelines, you might come across an issue where @internal/prisma/client is not found. you need to add one more step after installing dependencies for instance in GitHub actions, you can add the following step after npm install, which will generate the @internal/prisma/client

```java
- name: Generate partner-database prisma client
  run: npx prisma generate --schema ./prisma2/schema.prisma
```

## Conclusion

You can use multiple databases with Prisma by creating different schema files and generating separate Prisma clients for each database.

If there’s a better way to do this, please leave some comments.
