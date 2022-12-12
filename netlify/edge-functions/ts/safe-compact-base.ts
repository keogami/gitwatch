export const safeCompactBase = String.fromCharCode(
  ...(function* (...excludeStr: string[]) {
    const excludes = excludeStr.map(it => it.charCodeAt(0))
    for (let i = 0; i < 256; i++) {
      if (excludes.includes(i)) continue
      yield i
    }
  }("/", ":")),
)
