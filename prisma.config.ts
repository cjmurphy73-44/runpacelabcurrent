import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: {
    kind: 'single',
    filePath: './prisma/schema.prisma',
  },
  datasources: [
    {
      provider: 'postgresql',
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rpl_db?schema=public',
    },
  ],
});
