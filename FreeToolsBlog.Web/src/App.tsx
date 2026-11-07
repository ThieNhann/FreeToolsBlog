import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import DOMPurify from "dompurify";
import { ApiError, api, findPublishedPost, userIdFromToken, type CommentRecord, type Page, type PostInput, type PostRecord } from "./api";
import { isRichTextHtml, toEditorHtml } from "./postContent";

const RichTextEditor = lazy(() => import("./RichTextEditor"));

const TOKEN_KEY = "freetoolsblog-admin-token";
const PAGE_SIZE = 10;
const ADMIN_PAGE_SIZE = 50;

async function loadPublishedPage(pageNumber: number) {
  const firstPage = await api.listPosts(1, ADMIN_PAGE_SIZE);
  const lastApiPage = Math.max(1, firstPage.totalPages);
  const needed = pageNumber * PAGE_SIZE + 1;
  const published: PostRecord[] = [];
  for (let apiPageNumber = lastApiPage; apiPageNumber >= 1 && published.length < needed; apiPageNumber -= 1) {
    const result = apiPageNumber === 1 ? firstPage : await api.listPosts(apiPageNumber, ADMIN_PAGE_SIZE);
    published.push(...result.data.filter((post) => post.isPublished).reverse());
  }
  const start = (pageNumber - 1) * PAGE_SIZE;
  return { data: published.slice(start, start + PAGE_SIZE), hasNext: published.length > start + PAGE_SIZE };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function formatViewCount(value: number) {
  return `${new Intl.NumberFormat("en-US").format(value)} ${value === 1 ? "view" : "views"}`;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 429 && error.retryAfterSeconds !== undefined) {
      const seconds = error.retryAfterSeconds;
      return `${error.message} Please try again in ${seconds} second${seconds === 1 ? "" : "s"}.`;
    }
    return error.message || fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

function SiteLink({ to, navigate, children, className = "" }: { to: string; navigate: (path: string) => void; children: ReactNode; className?: string }) {
  const currentPath = window.location.pathname;
  const isCurrent = currentPath === to || (to === "/" && currentPath.startsWith("/posts/")) || (to === "/admin" && currentPath.startsWith("/admin"));
  return <a className={className} href={to} aria-current={isCurrent ? "page" : undefined} onClick={(event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  }}>{children}</a>;
}

function ArrowIcon({ direction = "right" }: { direction?: "left" | "right" }) {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
    {direction === "left" ? <><path d="M16 10H4M9 5l-5 5 5 5" /></> : <><path d="M4 10h12M11 5l5 5-5 5" /></>}
  </svg>;
}

function SiteHeader({ navigate, admin = false, onLogout }: { navigate: (path: string) => void; admin?: boolean; onLogout?: () => void }) {
  return <header className="site-header">
    <div className="masthead-line">
      <SiteLink to="/" navigate={navigate} className="wordmark">FreeToolsBlog</SiteLink>
      <nav aria-label="Main navigation" className="header-nav">
        {admin ? <>
          <SiteLink to="/admin" navigate={navigate}>Posts</SiteLink>
          <button className="nav-button" type="button" onClick={onLogout}>Log out</button>
        </> : <>
          <SiteLink to="/" navigate={navigate}>Posts</SiteLink>
          <SiteLink to="/admin" navigate={navigate}>Admin</SiteLink>
        </>}
      </nav>
    </div>
    <div className="masthead-rule" />
  </header>;
}

function SiteFooter({ navigate }: { navigate: (path: string) => void }) {
  return <footer className="site-footer">
    <SiteLink to="/" navigate={navigate} className="footer-wordmark">FreeToolsBlog</SiteLink>
    <SiteLink to="/admin" navigate={navigate}>Admin</SiteLink>
  </footer>;
}

function ErrorNotice({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return <div className="error-notice" role="alert">
    <p>{children}</p>
    {onRetry && <button className="text-action" type="button" onClick={onRetry}>Try again</button>}
  </div>;
}

function LoadingRows() {
  return <div className="loading-list" aria-label="Loading posts" aria-busy="true">
    <span className="sr-only">Loading posts</span>
    {[0, 1, 2].map((row) => <div className="loading-row" key={row}><span /><span /><span /></div>)}
  </div>;
}

function PublicIndex({ navigate }: { navigate: (path: string) => void }) {
  const [pageNumber, setPageNumber] = useState(1);
  const [page, setPage] = useState<{ data: PostRecord[]; totalRecords?: number } | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadRetry, setLoadRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = activeSearch
          ? await api.searchPosts(activeSearch, pageNumber, PAGE_SIZE)
          : await loadPublishedPage(pageNumber);
        if (active) {
          setHasNext("hasNext" in result ? result.hasNext : pageNumber < result.totalPages);
          setPage({
            data: result.data,
            totalRecords: "totalRecords" in result ? result.totalRecords : undefined,
          });
        }
      } catch (reason) {
        if (active) setError(errorMessage(reason, "Could not load the post list."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [activeSearch, pageNumber, loadRetry]);

  const published = page?.data ?? [];
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setPageNumber(1);
    setActiveSearch(query.trim());
    setLoadRetry((current) => current + 1);
  };
  const clearSearch = () => {
    setQuery("");
    if (!activeSearch) return;
    setLoading(true);
    setError("");
    setPageNumber(1);
    setActiveSearch("");
  };

  return <>
    <SiteHeader navigate={navigate} />
    <main className="page-shell">
      <section className="index-intro" aria-labelledby="index-title">
        <h1 id="index-title">Free / open-source tools for you.</h1>
      </section>

      <section className="post-index" aria-label="Post list">
        <div className="section-heading"><h2>Posts</h2><span aria-live="polite">{loading ? "Updating" : activeSearch && page ? `${page.totalRecords} results` : ""}</span></div>
        <form className="public-search" role="search" onSubmit={submitSearch}>
          <label className="sr-only" htmlFor="post-search">Search posts by title or summary</label>
          <input id="post-search" type="search" value={query} maxLength={100} onChange={(event) => setQuery(event.target.value)} placeholder="Search posts…" />
          <button className="button button-dark" type="submit">Search</button>
          {query && <button className="text-action" type="button" onClick={clearSearch}>Clear</button>}
        </form>
        {loading ? <LoadingRows /> : error ? <ErrorNotice onRetry={() => { setLoading(true); setError(""); setLoadRetry((current) => current + 1); }}>{error}</ErrorNotice> : published.length ? <div className="post-list">
          {published.map((post, index) => <article className={`post-row ${index === 0 ? "post-row-featured" : ""}`} key={post.id}>
            <div className="post-meta"><time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time><span>POST</span><span>{formatViewCount(post.viewCount)}</span></div>
            <div className="post-copy">
              <h3><SiteLink to={`/posts/${encodeURIComponent(post.slug)}`} navigate={navigate}>{post.title}</SiteLink></h3>
              <p>{post.summary}</p>
              <SiteLink className="read-link" to={`/posts/${encodeURIComponent(post.slug)}`} navigate={navigate}>Read article <ArrowIcon /></SiteLink>
            </div>
            {post.coverImageUrl && <img className="post-cover" src={post.coverImageUrl} alt={`Cover image: ${post.title}`} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
          </article>)}
        </div> : <div className="empty-state">
          <h3>{activeSearch ? "No matching posts." : "No posts yet."}</h3>
          <p>{activeSearch ? "Try a different title or phrase." : "New posts will appear here."}</p>
        </div>}
        {!loading && !error && page && (pageNumber > 1 || hasNext) && <nav className="pagination" aria-label="Post pagination">
          <button type="button" onClick={() => { setLoading(true); setError(""); setPageNumber((current) => Math.max(1, current - 1)); }} disabled={pageNumber <= 1}>
            <ArrowIcon direction="left" /> {activeSearch ? "Previous results" : "Newer posts"}
          </button>
          <span>Page {pageNumber}</span>
          <button type="button" onClick={() => { setLoading(true); setError(""); setPageNumber((current) => current + 1); }} disabled={!hasNext}>
            {activeSearch ? "More results" : "Older posts"} <ArrowIcon />
          </button>
        </nav>}
      </section>
    </main>
    <SiteFooter navigate={navigate} />
  </>;
}

function PostBody({ content }: { content: string }) {
  if (isRichTextHtml(content)) {
    return <div className="article-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />;
  }
  const paragraphs = content.split(/\r?\n\s*\r?\n/).filter((paragraph) => paragraph.trim());
  return <div className="article-body">{paragraphs.map((paragraph, index) => <p key={index}>
    {paragraph.split(/\r?\n/).map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}{line}</span>)}
  </p>)}</div>;
}

function PostDetail({ slug, navigate }: { slug: string; navigate: (path: string) => void }) {
  const [post, setPost] = useState<PostRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comments, setComments] = useState<Page<CommentRecord> | null>(null);
  const [commentPage, setCommentPage] = useState(1);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState("");
  const [commentRetry, setCommentRetry] = useState(0);
  const [commentName, setCommentName] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentNotice, setCommentNotice] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const visiblePost = await findPublishedPost(slug);
        if (!visiblePost) throw new ApiError("This post does not exist or has not been published.", 404);
        const result = await api.getPost(slug);
        if (active) setPost(result);
      } catch (reason) {
        if (active) setError(reason instanceof ApiError && reason.status === 404 ? "Post not found." : errorMessage(reason, "Could not load the post."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    let active = true;
    void api.listComments(post.id, commentPage, PAGE_SIZE).then((result) => {
      if (active) setComments(result);
    }).catch((reason) => {
      if (active) setCommentsError(errorMessage(reason, "Could not load comments."));
    }).finally(() => { if (active) setCommentsLoading(false); });
    return () => { active = false; };
  }, [post, commentPage, commentRetry]);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!post) return;
    setCommentSaving(true);
    setCommentsError("");
    setCommentNotice("");
    try {
      await api.addComment(post.id, commentName.trim(), commentContent.trim());
      setCommentName("");
      setCommentContent("");
      const lastPage = Math.max(1, Math.ceil(((comments?.totalRecords ?? 0) + 1) / PAGE_SIZE));
      setCommentPage(lastPage);
      setCommentNotice("Comment submitted.");
      if (lastPage === commentPage) {
        try {
          setComments(await api.listComments(post.id, lastPage, PAGE_SIZE));
        } catch {
          setCommentsError("Comment submitted, but the list could not be refreshed.");
        }
      }
    } catch (reason) {
      setCommentsError(errorMessage(reason, "Could not submit your comment. Please try again."));
    } finally {
      setCommentSaving(false);
    }
  }

  return <>
    <SiteHeader navigate={navigate} />
    <main className="page-shell article-shell">
      <SiteLink to="/" navigate={navigate} className="back-link"><ArrowIcon direction="left" /> All posts</SiteLink>
      {loading ? <div className="article-loading" aria-busy="true"><span /><span /><span /></div> : error ? <div className="not-found"><h1>{error}</h1><p>This post may have been deleted or is not published.</p><SiteLink to="/" navigate={navigate} className="button button-dark">Back to posts</SiteLink></div> : post && <article>
        <header className="article-header">
          <h1>{post.title}</h1>
          <p className="article-summary">{post.summary}</p>
          <p className="article-byline">{post.userName ? `By ${post.userName} · ` : ""}{formatDate(post.updatedAt || post.createdAt)} · {formatViewCount(post.viewCount)}</p>
        </header>
        {post.coverImageUrl && <img className="article-cover" src={post.coverImageUrl} alt={`Cover image: ${post.title}`} onError={(event) => { event.currentTarget.hidden = true; }} />}
        <PostBody content={post.content} />
      </article>}

      {post && <section className="comments-section" aria-labelledby="comments-title">
        <div className="section-heading"><h2 id="comments-title">Comments</h2><span>{comments ? `${comments.totalRecords} comments` : ""}</span></div>
        {commentsLoading && !comments ? <LoadingRows /> : commentsError && !comments ? <ErrorNotice onRetry={() => setCommentRetry((current) => current + 1)}>{commentsError}</ErrorNotice> : comments?.data.length ? <ol className="comment-list">
          {comments.data.map((comment, index) => <li key={comment.id ?? `${comment.createdAt}-${index}`}>
            <div className="comment-meta"><strong>{comment.name}</strong><time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time></div>
            <p>{comment.content}</p>
          </li>)}
        </ol> : <p className="quiet-copy">No comments yet. Be the first to comment.</p>}
        {comments && comments.totalPages > 1 && <nav className="pagination comment-pagination" aria-label="Comment pagination">
          <button type="button" onClick={() => setCommentPage((current) => Math.max(1, current - 1))} disabled={commentPage <= 1}><ArrowIcon direction="left" /> Previous</button>
          <span>Page {commentPage}</span>
          <button type="button" onClick={() => setCommentPage((current) => Math.min(comments.totalPages, current + 1))} disabled={commentPage >= comments.totalPages}>Next <ArrowIcon /></button>
        </nav>}
        {commentsError && comments && <ErrorNotice>{commentsError}</ErrorNotice>}
        {commentNotice && <p className="success-notice" role="status">{commentNotice}</p>}
        <form className="comment-form" onSubmit={(event) => void submitComment(event)}>
          <h3>Leave a comment</h3>
          <label className="field-label" htmlFor="comment-name">Name</label>
          <input id="comment-name" name="name" autoComplete="name" required maxLength={100} value={commentName} onChange={(event) => setCommentName(event.target.value)} />
          <label className="field-label" htmlFor="comment-content">Comment</label>
          <textarea id="comment-content" name="content" required rows={5} value={commentContent} onChange={(event) => setCommentContent(event.target.value)} />
          <button className="button button-dark" type="submit" disabled={commentSaving}>{commentSaving ? "Submitting…" : "Submit comment"} <ArrowIcon /></button>
        </form>
      </section>}
    </main>
    <SiteFooter navigate={navigate} />
  </>;
}

function AdminLogin({ navigate, onLogin }: { navigate: (path: string) => void; onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const token = await api.login(email.trim(), password);
      sessionStorage.setItem(TOKEN_KEY, token);
      onLogin(token);
      navigate("/admin");
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 401 ? "Email or password is incorrect." : errorMessage(reason, "Could not log in."));
    } finally {
      setSaving(false);
    }
  }

  return <>
    <SiteHeader navigate={navigate} />
    <main className="page-shell admin-login-shell">
      <div className="admin-heading">
        <h1>Log in</h1>
        <p>Log in to manage posts.</p>
      </div>
      <form className="admin-form login-form" onSubmit={(event) => void submit(event)}>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        <label className="field-label" htmlFor="admin-email">Email</label>
        <input id="admin-email" type="email" name="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <label className="field-label" htmlFor="admin-password">Password</label>
        <input id="admin-password" type="password" name="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="button button-dark" type="submit" disabled={saving}>{saving ? "Logging in…" : "Log in"} <ArrowIcon /></button>
      </form>
    </main>
    <SiteFooter navigate={navigate} />
  </>;
}

async function loadAllPosts(token: string) {
  const first = await api.listPosts(1, ADMIN_PAGE_SIZE, token);
  const remaining = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) => api.listPosts(index + 2, ADMIN_PAGE_SIZE, token)));
  return [first, ...remaining].flatMap((page) => page.data).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function AdminArea({ path, token, navigate, onLogout }: { path: string; token: string; navigate: (path: string) => void; onLogout: () => void }) {
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editorError, setEditorError] = useState("");
  const editMatch = path.match(/^\/admin\/posts\/(\d+)$/);
  const editingId = editMatch ? Number(editMatch[1]) : null;
  const isNew = path === "/admin/posts/new";
  const isEditing = editingId !== null || isNew;

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setPosts(await loadAllPosts(token)); }
    catch (reason) { setError(errorMessage(reason, "Could not load posts.")); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    let active = true;
    void loadAllPosts(token).then((result) => { if (active) setPosts(result); })
      .catch((reason) => { if (active) setError(errorMessage(reason, "Could not load posts.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const selectedPost = editingId === null ? undefined : posts.find((post) => post.id === editingId);
  const visiblePosts = useMemo(() => posts.filter((post) => {
    const matchesFilter = filter === "all" || (filter === "published" ? post.isPublished : !post.isPublished);
    const needle = query.trim().toLocaleLowerCase("en-US");
    return matchesFilter && (!needle || `${post.title} ${post.slug}`.toLocaleLowerCase("en-US").includes(needle));
  }), [posts, filter, query]);

  async function savePost(post: PostRecord | undefined, input: PostInput & { isPublished: boolean }) {
    setEditorError("");
    if (post) {
      try {
        await api.updatePost(post.id, input, token);
        await reload();
        setNotice("Post updated.");
        navigate("/admin");
      } catch (reason) {
        setEditorError(errorMessage(reason, "Could not update the post."));
      }
      return;
    }

    const userId = userIdFromToken(token);
    if (!userId) {
      setEditorError("Could not read the user ID from your session. Please log in again.");
      return;
    }
    try {
      const { isPublished, ...createInput } = input;
      const created = await api.createPost({ ...createInput, userId }, token);
      if (isPublished) {
        try {
          await api.updatePost(created.id, input, token);
          await reload();
          setNotice("Post created and published.");
        } catch (reason) {
          await reload();
          setNotice(`Post saved as a draft, but could not be published: ${errorMessage(reason, "Please try again.")}`);
        }
      } else {
        await reload();
        setNotice("Post saved as a draft.");
      }
      navigate("/admin");
    } catch (reason) {
      setEditorError(errorMessage(reason, "Could not create the post."));
    }
  }

  async function deletePost(post: PostRecord) {
    if (!window.confirm(`Delete “${post.title}”? Its comments will also be deleted.`)) return;
    setDeletingId(post.id);
    setError("");
    try {
      await api.deletePost(post.id, token);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setNotice("Post deleted.");
    } catch (reason) {
      setError(errorMessage(reason, "Could not delete the post."));
    } finally {
      setDeletingId(null);
    }
  }

  return <>
    <SiteHeader navigate={navigate} admin onLogout={onLogout} />
    <main className="page-shell admin-shell">
      <div className="admin-heading admin-heading-wide">
        <div><h1>{isEditing ? (isNew ? "New post" : "Edit post") : "Manage posts"}</h1></div>
        {!isEditing && <SiteLink to="/admin/posts/new" navigate={navigate} className="button button-dark">Create post <ArrowIcon /></SiteLink>}
      </div>

      {isEditing ? <>
        <SiteLink to="/admin" navigate={navigate} className="back-link"><ArrowIcon direction="left" /> Post list</SiteLink>
        {loading && !isNew ? <LoadingRows /> : !isNew && !selectedPost ? <ErrorNotice onRetry={() => void reload()}>{error || "Post not found."}</ErrorNotice> : <PostEditor key={selectedPost?.id ?? "new"} post={selectedPost} error={editorError} onSave={savePost} onCancel={() => navigate("/admin")} />}
      </> : <>
        {notice && <p className="success-notice" role="status">{notice}</p>}
        {error && <ErrorNotice onRetry={() => void reload()}>{error}</ErrorNotice>}
        <div className="admin-toolbar">
          <label className="search-field"><span className="sr-only">Search by title or slug</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search posts…" /></label>
          <label className="filter-field"><span className="sr-only">Filter by status</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select></label>
        </div>
        {loading ? <LoadingRows /> : visiblePosts.length ? <div className="admin-post-list" aria-busy={deletingId !== null}>
          {visiblePosts.map((post) => <article className="admin-post-row" key={post.id}>
            <div className="admin-post-main"><h2><SiteLink to={`/admin/posts/${post.id}`} navigate={navigate}>{post.title}</SiteLink></h2><p>{post.slug}</p></div>
            <span className={`status-label ${post.isPublished ? "status-published" : "status-draft"}`}>{post.isPublished ? "Published" : "Draft"}</span>
            <time className="admin-date" dateTime={post.updatedAt}>Updated {formatDate(post.updatedAt)}</time>
            <div className="row-actions"><SiteLink to={`/admin/posts/${post.id}`} navigate={navigate} className="text-action">Edit</SiteLink><button className="text-action text-danger" type="button" onClick={() => void deletePost(post)} disabled={deletingId === post.id}>{deletingId === post.id ? "Deleting…" : "Delete"}</button></div>
          </article>)}
        </div> : <div className="empty-state admin-empty"><h2>{posts.length ? "No matching posts found." : "No posts yet."}</h2><p>{posts.length ? "Try a different search term or status." : "Create your first post to get started."}</p>{!posts.length && <SiteLink to="/admin/posts/new" navigate={navigate} className="button button-dark">Create post <ArrowIcon /></SiteLink>}</div>}
      </>}
    </main>
    <SiteFooter navigate={navigate} />
  </>;
}

function slugFromTitle(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 200);
}

function PostEditor({ post, error, onSave, onCancel }: { post?: PostRecord; error: string; onSave: (post: PostRecord | undefined, input: PostInput & { isPublished: boolean }) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [summary, setSummary] = useState(post?.summary ?? "");
  const [content, setContent] = useState(() => DOMPurify.sanitize(toEditorHtml(post?.content ?? "")));
  const [contentIsEmpty, setContentIsEmpty] = useState(() => !post?.content.trim());
  const [contentError, setContentError] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState(post?.coverImageUrl ?? "");
  const [isPublished, setIsPublished] = useState(Boolean(post?.isPublished));
  const [saving, setSaving] = useState(false);
  const updateContent = useCallback((value: string, isEmpty: boolean) => {
    setContent(value);
    setContentIsEmpty(isEmpty);
    setContentError("");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (contentIsEmpty) {
      setContentError("Post content is required.");
      return;
    }
    setContentError("");
    setSaving(true);
    try {
      await onSave(post, { title: title.trim(), slug: slug.trim(), summary: summary.trim(), content, coverImageUrl: coverImageUrl.trim() || null, isPublished });
    } finally {
      setSaving(false);
    }
  }

  return <form className="admin-form editor-form" onSubmit={(event) => void submit(event)}>
    {error && <ErrorNotice>{error}</ErrorNotice>}
    <div className="editor-grid">
      <div className="editor-main-fields">
        <label className="field-label" htmlFor="post-title">Title <span>Up to 200 characters</span></label>
        <input id="post-title" name="title" required maxLength={200} value={title} onChange={(event) => {
          const value = event.target.value;
          setTitle(value);
          if (!slugTouched) setSlug(slugFromTitle(value));
        }} />
        <label className="field-label" htmlFor="post-slug">Slug <span>Up to 200 characters</span></label>
        <input id="post-slug" name="slug" required maxLength={200} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" title="Use lowercase letters, numbers, and hyphens." value={slug} onChange={(event) => { setSlugTouched(true); setSlug(event.target.value); }} />
        <p className="field-hint">/posts/{slug || "your-post-slug"}</p>
        <label className="field-label" htmlFor="post-summary">Summary <span>{summary.length}/500</span></label>
        <textarea id="post-summary" name="summary" required maxLength={500} rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} />
        <label className="field-label" htmlFor="post-content">Content</label>
        <Suspense fallback={<div className="rich-text-loading" aria-busy="true">Loading editor…</div>}>
          <RichTextEditor initialContent={content} disabled={saving} onChange={updateContent} />
        </Suspense>
        {contentError && <p className="field-error" role="alert">{contentError}</p>}
        <p className="field-hint">Select text, then choose a size or formatting style.</p>
      </div>
      <aside className="editor-aside">
        <div className="editor-status">
          <h2>Status</h2>
          <label className="publish-toggle"><input type="checkbox" checked={!isPublished} onChange={(event) => setIsPublished(!event.target.checked)} /><span>Draft</span></label>
          <p>{post ? "Status changes will be saved with the post." : "New posts are always saved as drafts first."}</p>
        </div>
        <label className="field-label" htmlFor="post-cover">Cover image URL <span>Optional</span></label>
        <input id="post-cover" name="coverImageUrl" type="url" inputMode="url" placeholder="https://" value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} />
        {coverImageUrl && <img className="editor-cover-preview" src={coverImageUrl} alt="Cover image preview" onError={(event) => { event.currentTarget.hidden = true; }} />}
      </aside>
    </div>
    <div className="form-actions"><button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button><button type="submit" className="button button-dark" disabled={saving}>{saving ? "Saving…" : post ? "Save changes" : "Create post"} <ArrowIcon /></button></div>
  </form>;
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? "");

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    const onUnauthorized = () => {
      sessionStorage.removeItem(TOKEN_KEY);
      setToken("");
      setPath("/admin");
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("freetoolsblog:unauthorized", onUnauthorized);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("freetoolsblog:unauthorized", onUnauthorized);
    };
  }, []);

  function navigate(nextPath: string) {
    if (nextPath !== window.location.pathname) window.history.pushState({}, "", nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    navigate("/admin");
  }

  if (path === "/admin" || path.startsWith("/admin/")) {
    if (!token) return <AdminLogin navigate={navigate} onLogin={setToken} />;
    return <AdminArea path={path} token={token} navigate={navigate} onLogout={logout} />;
  }

  const detail = path.match(/^\/posts\/(.+)$/);
  if (detail) {
    let slug = detail[1];
    try { slug = decodeURIComponent(slug); } catch { /* Keep the encoded path and show the normal not-found state. */ }
    return <PostDetail slug={slug} navigate={navigate} />;
  }
  if (path === "/" || path === "") return <PublicIndex navigate={navigate} />;
  return <>
    <SiteHeader navigate={navigate} />
    <main className="page-shell not-found"><h1>This page doesn't exist.</h1><SiteLink to="/" navigate={navigate} className="button button-dark">Back to posts <ArrowIcon /></SiteLink></main>
    <SiteFooter navigate={navigate} />
  </>;
}
