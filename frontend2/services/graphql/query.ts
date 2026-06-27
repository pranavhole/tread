import { gql, type DocumentNode } from '@apollo/client'
import type { OperationDefinitionNode } from 'graphql'
import { apolloClient } from './client'

export const QUERIES = {
  ME: gql`
    query Me {
      me {
        id
        email
        username
        balance
        role
        isActive
        createdAt
        positions {
          id
          symbol
          qty
          avgPrice
          realizedPnl
          leverage
          createdAt
          updatedAt
        }
      }
    }
  `,

  ORDERS: gql`
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
        updatedAt
      }
    }
  `,

  TRADES: gql`
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

  POSITION: gql`
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

  CANDLES: gql`
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

  NOTIFICATIONS: gql`
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

  TRANSACTIONS: gql`
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
  LOGIN: gql`
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

  SIGNUP: gql`
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

  GOOGLE_LOGIN: gql`
    mutation GoogleLogin($email: String!, $name: String, $googleId: String) {
      googleLogin(email: $email, name: $name, googleId: $googleId) {
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

  CONNECT_WALLET: gql`
    mutation ConnectWallet($walletAddress: String!) {
      connectWallet(walletAddress: $walletAddress) {
        id
        email
        username
        balance
        role
      }
    }
  `,

  SKIP_WALLET_GRANT: gql`
    mutation SkipWalletGrant {
      skipWalletGrant {
        id
        email
        username
        balance
        role
      }
    }
  `,

  PURCHASE_TOKENS: gql`
    mutation PurchaseTokens(
      $packageUsd: Float!
      $walletAddress: String!
      $txHash: String!
      $currency: String
    ) {
      purchaseTokens(
        packageUsd: $packageUsd
        walletAddress: $walletAddress
        txHash: $txHash
        currency: $currency
      ) {
        id
        email
        username
        balance
        role
      }
    }
  `,

  PLACE_ORDER: gql`
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

  CANCEL_ORDER: gql`
    mutation CancelOrder($id: ID!) {
      cancelOrder(id: $id) {
        id
        status
        cancelledAt
      }
    }
  `,

  CANCEL_OPEN_ORDERS: gql`
    mutation CancelOpenOrders {
      cancelOpenOrders
    }
  `,

  CREATE_NOTIFICATION: gql`
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

  DELETE_NOTIFICATION: gql`
    mutation DeleteNotification($id: ID!) {
      deleteNotification(id: $id)
    }
  `,
}

export const SUBSCRIPTIONS = {
  ORDER_UPDATED: gql`
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

type GraphQLVariables = Record<string, unknown>

export async function run_query<T = unknown>(
  operation: DocumentNode,
  variables?: GraphQLVariables
): Promise<T> {
  const def = operation.definitions.find(
    (definition): definition is OperationDefinitionNode =>
      definition.kind === 'OperationDefinition'
  )

  if (def?.operation === 'query') {
    const { data } = await apolloClient.query<T>({
      query: operation,
      variables,
      fetchPolicy: 'network-only',
    })
    return data as unknown as T
  }

  const { data } = await apolloClient.mutate<T>({
    mutation: operation,
    variables,
  })
  return data as unknown as T
}
