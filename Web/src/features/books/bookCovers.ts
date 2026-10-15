/** Placeholder colours for books without a cover, by content type. */
const typeCoverClasses: Record<string, string> = {
  novel: 'bg-type-novel text-type-novel-ink',
  manga: 'bg-type-manga text-type-manga-ink',
  manhua: 'bg-type-manhua text-type-manhua-ink',
  manhwa: 'bg-type-manhwa text-type-manhwa-ink',
}

export function typeCoverClass(contentType: string) {
  return typeCoverClasses[contentType.trim().toLowerCase()] ?? 'bg-type-other text-type-other-ink'
}

/** Up to two initials from the capitalised words of a title. */
export function titleInitials(title: string) {
  const words = title.split(/\s+/).filter((word) => /^\p{Lu}/u.test(word))
  const picked = (words.length ? words : title.split(/\s+/)).slice(0, 2)
  return picked.map((word) => word.charAt(0).toUpperCase()).join('')
}
