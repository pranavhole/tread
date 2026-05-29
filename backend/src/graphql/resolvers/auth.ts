import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { builder } from '../schema.js'
import { ENV } from '../../config/env.js'
import type { User } from '@prisma/client'

interface AuthPayloadShape {
  token: string
  user: User
}

const AuthPayload = builder.objectRef<AuthPayloadShape>('AuthPayload').implement({
  fields: (t) => ({
    token: t.string({ resolve: (p) => p.token }),
    user: t.prismaField({
      type: 'User',
      resolve: (_query, p) => p.user,
    }),
  }),
})

const PURCHASE_PACKAGES: Record<number, number> = {
  1: 1000,
  5: 10000,
  10: 100000,
}

const STARTER_TOKEN_GRANT = 100000

const signAuthToken = (user: User) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    String(ENV.JWT_SECRET),
    { expiresIn: '7d' }
  )

export const PlaceOrderInput = builder.inputType('PlaceOrderInput', {
  fields: (t) => ({
    symbol: t.string({ required: false }),
    side: t.string({ required: true }),
    type: t.string({ required: true }),
    qty: t.float({ required: true }),
    price: t.float({ required: false }),
    stopPrice: t.float({ required: false }),
    timeInForce: t.string({ required: false }),
  }),
})

builder.mutationField('login', (t) =>
  t.field({
    type: AuthPayload,
    args: {
      email: t.arg.string({ required: true }),
      password: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const user = await ctx.prisma.user.findUnique({ where: { email: args.email } })
      if (!user) throw new Error('Invalid email or password')
      const valid = await bcrypt.compare(args.password, user.password)
      if (!valid) throw new Error('Invalid email or password')
      const token = signAuthToken(user)
      return { token, user }
    },
  })
)

builder.mutationField('googleLogin', (t) =>
  t.field({
    type: AuthPayload,
    args: {
      email: t.arg.string({ required: true }),
      name: t.arg.string({ required: false }),
      googleId: t.arg.string({ required: false }),
    },
    resolve: async (_root, args, ctx) => {
      const email = args.email.trim().toLowerCase()
      if (!email) throw new Error('Google account email is required')

      let user = await ctx.prisma.user.findUnique({ where: { email } })

      if (!user) {
        const passwordSeed = args.googleId || `${email}:${Date.now()}`
        const hashed = await bcrypt.hash(passwordSeed, 10)
        user = await ctx.prisma.user.create({
          data: {
            email,
            password: hashed,
            username: undefined,
            balance: 0,
          },
        })
      }

      return { token: signAuthToken(user), user }
    },
  })
)

builder.mutationField('signup', (t) =>
  t.field({
    type: AuthPayload,
    args: {
      email: t.arg.string({ required: true }),
      password: t.arg.string({ required: true }),
      username: t.arg.string({ required: false }),
    },
    resolve: async (_root, args, ctx) => {
      const exists = await ctx.prisma.user.findUnique({ where: { email: args.email } })
      if (exists) throw new Error('User already exists')
      const hashed = await bcrypt.hash(args.password, 10)
      const user = await ctx.prisma.user.create({
        data: { email: args.email, password: hashed, username: args.username ?? undefined, balance: 0 },
      })
      await ctx.prisma.position.create({
        data: { userId: user.id, symbol: 'BTCUSDT', qty: 0, avgPrice: 0 },
      })
      await ctx.prisma.transaction.create({
        data: { userId: user.id, type: 'DEPOSIT', amount: 0, note: 'Account created; connect MetaMask to claim starter tokens' },
      })
      const token = signAuthToken(user)
      return { token, user }
    },
  })
)

builder.mutationField('connectWallet', (t) =>
  t.prismaField({
    type: 'User',
    args: {
      walletAddress: t.arg.string({ required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      const walletAddress = args.walletAddress.trim().toLowerCase()
      if (!/^0x[a-f0-9]{40}$/.test(walletAddress)) throw new Error('Invalid MetaMask wallet address')

      const existingGrant = await ctx.prisma.transaction.findFirst({
        where: {
          userId: ctx.user.id,
          type: 'DEPOSIT',
          note: { startsWith: 'MetaMask starter grant:' },
        },
      })

      if (!existingGrant) {
        await ctx.prisma.$transaction([
          ctx.prisma.user.update({
            where: { id: ctx.user.id },
            data: { balance: { increment: STARTER_TOKEN_GRANT } },
          }),
          ctx.prisma.transaction.create({
            data: {
              userId: ctx.user.id,
              type: 'DEPOSIT',
              amount: STARTER_TOKEN_GRANT,
              note: `MetaMask starter grant:${walletAddress}`,
            },
          }),
        ])
      }

      return ctx.prisma.user.findUniqueOrThrow({ ...query, where: { id: ctx.user.id } })
    },
  })
)

builder.mutationField('purchaseTokens', (t) =>
  t.prismaField({
    type: 'User',
    args: {
      packageUsd: t.arg.float({ required: true }),
      walletAddress: t.arg.string({ required: true }),
      txHash: t.arg.string({ required: true }),
      currency: t.arg.string({ required: false }),
    },
    resolve: async (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      const packageUsd = Number(args.packageUsd)
      const tokenAmount = PURCHASE_PACKAGES[packageUsd]
      if (!tokenAmount) throw new Error('Unsupported token package')

      const walletAddress = args.walletAddress.trim().toLowerCase()
      if (!/^0x[a-f0-9]{40}$/.test(walletAddress)) throw new Error('Invalid MetaMask wallet address')
      if (!args.txHash.trim()) throw new Error('Transaction hash is required')

      const existingPurchase = await ctx.prisma.transaction.findFirst({
        where: {
          userId: ctx.user.id,
          type: 'DEPOSIT',
          note: { contains: `tx:${args.txHash}` },
        },
      })
      if (existingPurchase) {
        return ctx.prisma.user.findUniqueOrThrow({ ...query, where: { id: ctx.user.id } })
      }

      await ctx.prisma.$transaction([
        ctx.prisma.user.update({
          where: { id: ctx.user.id },
          data: { balance: { increment: tokenAmount } },
        }),
        ctx.prisma.transaction.create({
          data: {
            userId: ctx.user.id,
            type: 'DEPOSIT',
            amount: tokenAmount,
            note: `Token purchase $${packageUsd} via ${args.currency ?? 'crypto'} wallet:${walletAddress} tx:${args.txHash}`,
          },
        }),
      ])

      return ctx.prisma.user.findUniqueOrThrow({ ...query, where: { id: ctx.user.id } })
    },
  })
)

builder.queryField('me', (t) =>
  t.prismaField({
    type: 'User',
    nullable: true,
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return ctx.prisma.user.findUnique({ ...query, where: { id: ctx.user.id } })
    },
  })
)
