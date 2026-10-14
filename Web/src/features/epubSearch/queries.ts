import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEpubSearchClient } from './clientContext'
import type { EpubDownloadJob, EpubDownloadRequest, EpubSearchRequest } from './types'
import { isDownloadFinished } from './types'

export const epubSearchKeys = {
  all: ['epub-search'] as const,
  search: (request: EpubSearchRequest) => ['epub-search', 'search', request] as const,
  download: (jobId: string) => ['epub-search', 'download', jobId] as const,
}

/** Polling interval for a running download. */
export const downloadPollMs = 1000

export function useEpubSearch(request: EpubSearchRequest | null) {
  const client = useEpubSearchClient()
  return useQuery({
    queryKey: request ? epubSearchKeys.search(request) : epubSearchKeys.all,
    queryFn: request ? ({ signal }) => client.search(request, signal) : skipToken,
    staleTime: 5 * 60 * 1000,
  })
}

export function useStartEpubDownload() {
  const client = useEpubSearchClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: EpubDownloadRequest) => client.startDownload(request),
    onSuccess: (job) => {
      queryClient.setQueryData(epubSearchKeys.download(job.id), job)
    },
  })
}

export function useEpubDownload(jobId: string | null) {
  const client = useEpubSearchClient()
  return useQuery({
    queryKey: jobId ? epubSearchKeys.download(jobId) : epubSearchKeys.all,
    queryFn: jobId ? () => client.getDownload(jobId) : skipToken,
    refetchInterval: (query) => {
      const job: EpubDownloadJob | undefined = query.state.data
      return job && isDownloadFinished(job.status) ? false : downloadPollMs
    },
  })
}

export function useCancelEpubDownload() {
  const client = useEpubSearchClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (jobId: string) => client.cancelDownload(jobId),
    onSuccess: (job) => {
      queryClient.setQueryData(epubSearchKeys.download(job.id), job)
    },
  })
}
