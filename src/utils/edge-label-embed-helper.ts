/* Added by an LLM agent */

/** A single note embed on its own line, e.g. `![[Note#^block-id]]` or `![[Note|alias]]` */
const EMBED_LINE_PATTERN = /^!\[\[[^[\]]+\]\]$/

/**
 * A fenced block whose info string is exactly `sync` (the `sync-embeds` plugin's block), e.g.
 * ```sync
 * ![[Note#^block-id{seamless:true}]]
 * ```
 * Backtick and tilde fences of three or more characters are matched; the closing fence has to
 * repeat the opening one exactly. Group 2 is the fence body.
 */
const SYNC_FENCE_PATTERN = /^(`{3,}|~{3,})sync[ \t]*\n([\s\S]*?)\n?\1[ \t]*$/

/**
 * Whether a label consists of nothing but note embeds, and so is safe to render in
 * "embeds only" mode. Accepted:
 *
 * - one or more bare `![[...]]` embeds, one per line
 * - a single ` ```sync ` block whose body is one or more bare `![[...]]` embeds
 *
 * Anything else - prose, formatting, a bare link, an embed with text around it - is rejected,
 * so the label keeps Obsidian's plain-text behaviour.
 */
export function isEmbedOnlyLabel(source: string): boolean {
  const trimmed = source.trim()
  if (trimmed.length === 0) return false

  const fenceMatch = SYNC_FENCE_PATTERN.exec(trimmed)
  return isEmbedLines(fenceMatch ? fenceMatch[2] : trimmed)
}

/** Whether every non-blank line of `content` is a bare embed (and there is at least one) */
function isEmbedLines(content: string): boolean {
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  return lines.length > 0 && lines.every(line => EMBED_LINE_PATTERN.test(line))
}
