/** Follow new content only when the reader is already near the latest message. */
export function shouldFollowChat({ scrollTop, clientHeight, scrollHeight }: { scrollTop: number; clientHeight: number; scrollHeight: number }) {
  return scrollHeight - clientHeight - scrollTop <= 80;
}
