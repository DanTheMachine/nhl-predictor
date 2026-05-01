import { PrismaClient } from '@prisma/client'

import { appConfig, isDbConfigured } from '../config.js'

declare global {
  var __nhlPrisma__: PrismaClient | undefined
}

export function getPrismaClient() {
  if (!isDbConfigured()) return null

  if (!globalThis.__nhlPrisma__) {
    globalThis.__nhlPrisma__ = new PrismaClient({
      datasources: {
        db: {
          url: appConfig.databaseUrl ?? undefined,
        },
      },
    })
  }

  return globalThis.__nhlPrisma__
}
