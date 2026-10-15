import type { BookFile } from '@/api/bookFiles'

export function FileContents({
  file,
  className = 'file-contents',
  suffix = '',
}: {
  file: Pick<BookFile, 'title' | 'firstContentLabel' | 'lastContentLabel'>
  className?: string
  /** Text after the range (e.g. a separator), only rendered with the range. */
  suffix?: string
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
    <p className={className} title={`${file.firstContentLabel} → ${file.lastContentLabel}`}>
      {first === last ? first : `${first} → ${last}`}
      {suffix}
    </p>
  )
}
