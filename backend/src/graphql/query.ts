import { apolloServer, type Context } from './index.js'
import { prisma } from '../config/db.js'

export const QUERIES = {
  ME: `
    query Me {
      me {
        id
        email
        username
        balance
        role
        isActive
        createdAt
      }
    }
  `,

  ORDERS: `
    query Orders {
      orders {
        id
        symbol
        side
        type
        timeInForce
        status
        qty
        filledQty
        price
        stopPrice
        fees
        filledAt
        cancelledAt
        createdAt
      }
    }
  `,

  TRADES: `
    query Trades {
      trades {
        id
        orderId
        price
        qty
        side
        fees
        realizedPnl
        isMaker
        createdAt
      }
    }
  `,

  POSITION: `
    query Position($symbol: String) {
      position(symbol: $symbol) {
        id
        symbol
        qty
        avgPrice
        realizedPnl
        leverage
      }
    }
  `,

  CANDLES: `
    query Candles($symbol: String!, $interval: String!) {
      candles(symbol: $symbol, interval: $interval) {
        openTime
        open
        high
        low
        close
        volume
        closeTime
      }
    }
  `,

  NOTIFICATIONS: `
    query Notifications {
      notifications {
        id
        symbol
        targetPrice
        condition
        triggered
        triggeredAt
        createdAt
      }
    }
  `,

  TRANSACTIONS: `
    query Transactions {
      transactions {
        id
        type
        amount
        note
        createdAt
      }
    }
  `,
}

export const MUTATIONS = {
  LOGIN: `
    mutation Login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        token
        user {
          id
          email
          username
          balance
          role
        }
      }
    }
  `,

  SIGNUP: `
    mutation Signup(
      $email: String!
      $password: String!
      $username: String
    ) {
      signup(email: $email, password: $password, username: $username) {
        token
        user {
          id
          email
          username
          balance
        }
      }
    }
  `,

  PLACE_ORDER: `
    mutation PlaceOrder($input: PlaceOrderInput!) {
      placeOrder(input: $input) {
        id
        symbol
        side
        type
        status
        qty
        filledQty
        price
        fees
        createdAt
      }
    }
  `,

  CANCEL_ORDER: `
    mutation CancelOrder($id: ID!) {
      cancelOrder(id: $id) {
        id
        status
        cancelledAt
      }
    }
  `,

  CREATE_NOTIFICATION: `
    mutation CreateNotification(
      $symbol: String!
      $targetPrice: Float!
      $condition: String!
    ) {
      createNotification(
        symbol: $symbol
        targetPrice: $targetPrice
        condition: $condition
      ) {
        id
        symbol
        targetPrice
        condition
        triggered
        createdAt
      }
    }
  `,

  DELETE_NOTIFICATION: `
    mutation DeleteNotification($id: ID!) {
      deleteNotification(id: $id)
    }
  `,
}

export const SUBSCRIPTIONS = {
  ORDER_UPDATED: `
    subscription OrderUpdated {
      orderUpdated {
        id
        symbol
        side
        type
        status
        qty
        filledQty
        price
        fees
        filledAt
        updatedAt
      }
    }
  `,
}

export async function run_query<T = any>(
  operation: string,
  variables?: Record<string, any>,
  contextValue?: Partial<Context>
): Promise<T> {
  const result = await apolloServer.executeOperation(
    { query: operation, variables },
    {
      contextValue: {
        prisma,
        user: null,
        ...contextValue,
      } as Context,
    }
  )
  if (result.body.kind !== 'single') throw new Error('Unexpected streamed response')
  if (result.body.singleResult.errors?.length) {
    throw new Error(result.body.singleResult.errors[0].message)
  }
  return result.body.singleResult.data as T
}
