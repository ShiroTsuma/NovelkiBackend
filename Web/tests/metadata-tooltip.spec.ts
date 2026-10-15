import { expect, test } from '@playwright/test'
import { installLayoutApiMocks, layoutBooks, seedAuthenticatedSession } from './fixtures/api.ts'

const longText = Array.from(
  { length: 12 },
  (_, i) => `Sentence ${i + 1} of a deliberately long genre description used to test wrapping.`,
).join(' ')

test('long metadata tooltip stays inside the viewport', async ({ page }) => {
  await seedAuthenticatedSession(page)
  await installLayoutApiMocks(page)
  const book = { ...layoutBooks[0]!, genreDescriptions: { Fantasy: longText } }
  await page.route('**/api/v1/book/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (route) =>
    route.fulfill({ json: book }),
  )
  await page.goto('/books/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  await page.getByRole('heading', { level: 1 }).waitFor()
  await page.getByText('Fantasy', { exact: true }).first().hover()
  const tooltip = page.getByRole('tooltip')
  await tooltip.waitFor()
  const box = await tooltip.boundingBox()
  const viewport = page.viewportSize()!
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
})
