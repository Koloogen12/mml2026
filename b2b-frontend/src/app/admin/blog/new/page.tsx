import { createPostAction } from '../actions';

// Visiting /admin/blog/new immediately provisions a fresh draft and
// redirects to its editor. Kept as a standalone page so the "Новый пост"
// button can be a plain <Link> on pages that can't host a form.
export default async function NewPostPage() {
  await createPostAction();
  // createPostAction redirects — this line is never reached.
  return null;
}
