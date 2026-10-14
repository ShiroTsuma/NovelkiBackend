import type { BookFile } from '@/api/bookFiles'

export function FileContents({
  file,
}: {
  file: Pick<BookFile, 'title' | 'firstContentLabel' | 'lastContentLabel'>
}) {
  if (!file.firstContentLabel || !file.lastContentLabel) return null
  function shorten(label: string) {
    const prefix = file.title.trim()
    return prefix &&
      label.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase()) &&
      /^[\s:–—-]/.test(label.slice(prefix.length, prefix.length + 1))
      ? label
          .slice(prefix.length)
          .trim()
          .replace(/^[-: ]+/, '') || label
      : label
  }
  const first = shorten(file.firstContentLabel)
  const last = shorten(file.lastContentLabel)
  return (
    <p className="file-contents" title={`${file.firstContentLabel} → ${file.lastContentLabel}`}>
      {first === last ? first : `${first} → ${last}`}
    </p>
  )
}
