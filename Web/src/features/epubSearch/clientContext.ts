import { createContext, useContext } from 'react'
import { epubSearchClient } from './client'
import type { EpubSearchClient } from './types'

/**
 * Lets tests (or a future settings toggle) swap the client without touching
 * components. Defaults to the app-wide client from client.ts.
 */
export const EpubSearchClientContext = createContext<EpubSearchClient>(epubSearchClient)

export function useEpubSearchClient(): EpubSearchClient {
  return useContext(EpubSearchClientContext)
}
