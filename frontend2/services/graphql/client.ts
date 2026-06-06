import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'
import { getMainDefinition } from '@apollo/client/utilities'
import { setContext } from '@apollo/client/link/context'

const GRAPHQL_HTTP_URL = process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL ?? 'http://localhost:5000/graphql'
const GRAPHQL_WS_URL = process.env.NEXT_PUBLIC_GRAPHQL_WS_URL ?? 'ws://localhost:5000/graphql'

const httpLink = new HttpLink({ uri: GRAPHQL_HTTP_URL })

const authLink = setContext((_, { headers }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return { headers: { ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) } }
})

const wsLink = typeof window !== 'undefined'
  ? new GraphQLWsLink(
      createClient({
        url: GRAPHQL_WS_URL,
        connectionParams: () => {
          const token = localStorage.getItem('token')
          return token ? { authorization: `Bearer ${token}` } : {}
        },
      })
    )
  : null

const splitLink = wsLink
  ? split(
      ({ query }) => {
        const def = getMainDefinition(query)
        return def.kind === 'OperationDefinition' && def.operation === 'subscription'
      },
      wsLink,
      authLink.concat(httpLink)
    )
  : authLink.concat(httpLink)

export const apolloClient = new ApolloClient({ link: splitLink, cache: new InMemoryCache() })
