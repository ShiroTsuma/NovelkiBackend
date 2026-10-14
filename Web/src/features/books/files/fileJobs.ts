import { skipToken, useQuery } from '@tanstack/react-query'
import { bookFilesApi, type FileJob } from '@/api/bookFiles'
import { HttpError } from '@/api/http'

export function fileError(error: unknown) {
  return error instanceof HttpError
    ? error.apiError.detail
    : error instanceof Error
      ? error.message
      : 'The EPUB operation failed. Please try again.'
}

export const isJobWorking = (job?: FileJob | null) =>
  Boolean(
    job && ['Uploading', 'Queued', 'Processing', 'CommitQueued', 'Committing'].includes(job.status),
  )

export function useFileJob(id: string | undefined, initial?: FileJob | null) {
  return useQuery({
    queryKey: ['epub-job', id],
    queryFn: id ? () => bookFilesApi.job(id) : skipToken,
    initialData: initial ?? undefined,
    refetchInterval: (query) => (isJobWorking(query.state.data) ? 1000 : false),
    refetchOnWindowFocus: true,
    retry: false,
  })
}
