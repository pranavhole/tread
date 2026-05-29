import SchemaBuilder from '@pothos/core'
import PrismaPlugin from '@pothos/plugin-prisma'
import type PrismaTypes from '../generated/pothos-types.js'
import { getDatamodel } from '../generated/pothos-types.js'
import { prisma } from '../config/db.js'

export type Context = {
  user: { id: string; email: string; role: string } | null
  prisma: typeof prisma
}

export const builder = new SchemaBuilder<{
  PrismaTypes: PrismaTypes
  Context: Context
}>({
  plugins: [PrismaPlugin],
  prisma: { client: prisma, dmmf: getDatamodel() },
})

builder.queryType({})
builder.mutationType({})
builder.subscriptionType({})
