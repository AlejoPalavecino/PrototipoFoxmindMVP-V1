import type { MuroComment, MuroPost, WallPublication, WallRole } from '../model/ClassroomWall';

const authorName = (role: WallRole) => role === 'docente' ? 'Profa. Martínez' : 'Valentina Gómez';

// Null means the original blank guard rejected the input; callers keep their drafts.
export function publishWallPost(posts: MuroPost[], input: WallPublication, now = Date.now): MuroPost[] | null {
  if (!input.content.trim()) return null;
  const post: MuroPost = {
    id: `post-${now()}`,
    authorName: authorName(input.role),
    authorRole: input.role,
    timestamp: 'Justo ahora',
    title: input.title.trim() || undefined,
    content: input.content.trim(),
    isPinned: input.role === 'docente' ? input.isPinned : false,
    type: input.role === 'docente' ? 'announcement' : 'doubt',
    attachment: input.attachment || undefined,
    likesCount: 0,
    isLiked: false,
    comments: []
  };
  return [post, ...posts];
}

export function toggleWallLike(posts: MuroPost[], postId: string): MuroPost[] {
  return posts.map(post => {
    if (post.id === postId) {
      const isLiked = !post.isLiked;
      return {
        ...post,
        isLiked,
        likesCount: isLiked ? post.likesCount + 1 : Math.max(0, post.likesCount - 1)
      };
    }
    return post;
  });
}

export function addWallComment(posts: MuroPost[], postId: string, role: WallRole, text: string | undefined, now = Date.now): MuroPost[] | null {
  const content = text?.trim();
  if (!content) return null;
  const comment: MuroComment = {
    id: `c-${now()}`,
    authorName: authorName(role),
    authorRole: role,
    timestamp: 'Justo ahora',
    content
  };
  return posts.map(post => post.id === postId ? { ...post, comments: [...post.comments, comment] } : post);
}
