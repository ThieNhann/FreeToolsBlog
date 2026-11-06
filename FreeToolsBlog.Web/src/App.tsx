import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, api, findPublishedPost, userIdFromToken, type CommentRecord, type Page, type PostInput, type PostRecord } from "./api";

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
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function errorMessage(error: unknown, fallback: string) {
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
      <p className="masthead-note">Công cụ miễn phí · Hướng dẫn thực tế</p>
      <nav aria-label="Điều hướng chính" className="header-nav">
        {admin ? <>
          <SiteLink to="/admin" navigate={navigate}>Bài viết</SiteLink>
          <button className="nav-button" type="button" onClick={onLogout}>Đăng xuất</button>
        </> : <>
          <SiteLink to="/" navigate={navigate}>Bài viết</SiteLink>
          <SiteLink to="/admin" navigate={navigate}>Quản trị</SiteLink>
        </>}
      </nav>
    </div>
    <div className="masthead-rule" />
  </header>;
}

function SiteFooter({ navigate }: { navigate: (path: string) => void }) {
  return <footer className="site-footer">
    <SiteLink to="/" navigate={navigate} className="footer-wordmark">FreeToolsBlog</SiteLink>
    <span>Công cụ miễn phí và cách sử dụng.</span>
    <SiteLink to="/admin" navigate={navigate}>Quản trị</SiteLink>
  </footer>;
}

function ErrorNotice({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return <div className="error-notice" role="alert">
    <p>{children}</p>
    {onRetry && <button className="text-action" type="button" onClick={onRetry}>Thử lại</button>}
  </div>;
}

function LoadingRows() {
  return <div className="loading-list" aria-label="Đang tải bài viết" aria-busy="true">
    <span className="sr-only">Đang tải bài viết</span>
    {[0, 1, 2].map((row) => <div className="loading-row" key={row}><span /><span /><span /></div>)}
  </div>;
}

function PublicIndex({ navigate }: { navigate: (path: string) => void }) {
  const [pageNumber, setPageNumber] = useState(1);
  const [page, setPage] = useState<{ data: PostRecord[] } | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadRetry, setLoadRetry] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await loadPublishedPage(pageNumber);
        if (active) {
          setHasNext(result.hasNext);
          setPage({ data: result.data });
        }
      } catch (reason) {
        if (active) setError(errorMessage(reason, "Không thể tải danh sách bài viết."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [pageNumber, loadRetry]);

  const published = page?.data ?? [];

  return <>
    <SiteHeader navigate={navigate} />
    <main className="page-shell">
      <section className="index-intro" aria-labelledby="index-title">
        <h1 id="index-title">Công cụ hữu ích<br />cho công việc<br className="sm:hidden" /> mỗi ngày.</h1>
        <p className="intro-copy">Bài viết về công cụ trực tuyến miễn phí và cách sử dụng chúng trong công việc hằng ngày.</p>
      </section>

      <section className="post-index" aria-label="Danh sách bài viết">
        <div className="section-heading"><h2>Bài viết</h2><span>{loading ? "Đang cập nhật" : ""}</span></div>
        {loading ? <LoadingRows /> : error ? <ErrorNotice onRetry={() => { setLoading(true); setError(""); setLoadRetry((current) => current + 1); }}>{error}</ErrorNotice> : published.length ? <div className="post-list">
          {published.map((post, index) => <article className={`post-row ${index === 0 ? "post-row-featured" : ""}`} key={post.id}>
            <div className="post-meta"><time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time><span>BÀI VIẾT</span></div>
            <div className="post-copy">
              <h3><SiteLink to={`/posts/${encodeURIComponent(post.slug)}`} navigate={navigate}>{post.title}</SiteLink></h3>
              <p>{post.summary}</p>
              <SiteLink className="read-link" to={`/posts/${encodeURIComponent(post.slug)}`} navigate={navigate}>Đọc bài <ArrowIcon /></SiteLink>
            </div>
            {post.coverImageUrl && <img className="post-cover" src={post.coverImageUrl} alt={`Ảnh bìa: ${post.title}`} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
          </article>)}
        </div> : <div className="empty-state">
          <h3>Chưa có bài viết nào.</h3>
          <p>Bài viết mới sẽ xuất hiện tại đây.</p>
        </div>}
        {!loading && !error && page && (pageNumber > 1 || hasNext) && <nav className="pagination" aria-label="Phân trang bài viết">
          <button type="button" onClick={() => { setLoading(true); setError(""); setPageNumber((current) => Math.max(1, current - 1)); }} disabled={pageNumber <= 1}>
            <ArrowIcon direction="left" /> Bài mới hơn
          </button>
          <span>Trang {pageNumber}</span>
          <button type="button" onClick={() => { setLoading(true); setError(""); setPageNumber((current) => current + 1); }} disabled={!hasNext}>
            Bài cũ hơn <ArrowIcon />
          </button>
        </nav>}
      </section>
    </main>
    <SiteFooter navigate={navigate} />
  </>;
}

function PostBody({ content }: { content: string }) {
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
        if (!visiblePost) throw new ApiError("Bài viết không tồn tại hoặc chưa được xuất bản.", 404);
        const result = await api.getPost(slug);
        if (active) setPost(result);
      } catch (reason) {
        if (active) setError(reason instanceof ApiError && reason.status === 404 ? "Không tìm thấy bài viết." : errorMessage(reason, "Không thể tải bài viết."));
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
      if (active) setCommentsError(errorMessage(reason, "Không thể tải bình luận."));
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
      setCommentNotice("Bình luận đã được gửi.");
      if (lastPage === commentPage) {
        try {
          setComments(await api.listComments(post.id, lastPage, PAGE_SIZE));
        } catch {
          setCommentsError("Bình luận đã được gửi, nhưng danh sách chưa tải lại được.");
        }
      }
    } catch (reason) {
      setCommentsError(errorMessage(reason, "Không thể gửi bình luận. Vui lòng thử lại."));
    } finally {
      setCommentSaving(false);
    }
  }

  return <>
    <SiteHeader navigate={navigate} />
    <main className="page-shell article-shell">
      <SiteLink to="/" navigate={navigate} className="back-link"><ArrowIcon direction="left" /> Tất cả bài viết</SiteLink>
      {loading ? <div className="article-loading" aria-busy="true"><span /><span /><span /></div> : error ? <div className="not-found"><h1>{error}</h1><p>Bài viết có thể đã bị xóa hoặc chưa được xuất bản.</p><SiteLink to="/" navigate={navigate} className="button button-dark">Quay lại danh sách</SiteLink></div> : post && <article>
        <header className="article-header">
          <h1>{post.title}</h1>
          <p className="article-summary">{post.summary}</p>
          <p className="article-byline">{post.userName ? `Tác giả ${post.userName} · ` : ""}{formatDate(post.updatedAt || post.createdAt)}</p>
        </header>
        {post.coverImageUrl && <img className="article-cover" src={post.coverImageUrl} alt={`Ảnh bìa: ${post.title}`} onError={(event) => { event.currentTarget.hidden = true; }} />}
        <PostBody content={post.content} />
      </article>}

      {post && <section className="comments-section" aria-labelledby="comments-title">
        <div className="section-heading"><h2 id="comments-title">Bình luận</h2><span>{comments ? `${comments.totalRecords} bình luận` : ""}</span></div>
        {commentsLoading && !comments ? <LoadingRows /> : commentsError && !comments ? <ErrorNotice onRetry={() => setCommentRetry((current) => current + 1)}>{commentsError}</ErrorNotice> : comments?.data.length ? <ol className="comment-list">
          {comments.data.map((comment, index) => <li key={comment.id ?? `${comment.createdAt}-${index}`}>
            <div className="comment-meta"><strong>{comment.name}</strong><time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time></div>
            <p>{comment.content}</p>
          </li>)}
        </ol> : <p className="quiet-copy">Chưa có bình luận. Bạn có thể là người đầu tiên.</p>}
        {comments && comments.totalPages > 1 && <nav className="pagination comment-pagination" aria-label="Phân trang bình luận">
          <button type="button" onClick={() => setCommentPage((current) => Math.max(1, current - 1))} disabled={commentPage <= 1}><ArrowIcon direction="left" /> Trước</button>
          <span>Trang {commentPage}</span>
          <button type="button" onClick={() => setCommentPage((current) => Math.min(comments.totalPages, current + 1))} disabled={commentPage >= comments.totalPages}>Tiếp <ArrowIcon /></button>
        </nav>}
        {commentsError && comments && <ErrorNotice>{commentsError}</ErrorNotice>}
        {commentNotice && <p className="success-notice" role="status">{commentNotice}</p>}
        <form className="comment-form" onSubmit={(event) => void submitComment(event)}>
          <h3>Để lại bình luận</h3>
          <label className="field-label" htmlFor="comment-name">Tên</label>
          <input id="comment-name" name="name" autoComplete="name" required maxLength={100} value={commentName} onChange={(event) => setCommentName(event.target.value)} />
          <label className="field-label" htmlFor="comment-content">Bình luận</label>
          <textarea id="comment-content" name="content" required rows={5} value={commentContent} onChange={(event) => setCommentContent(event.target.value)} />
          <button className="button button-dark" type="submit" disabled={commentSaving}>{commentSaving ? "Đang gửi…" : "Gửi bình luận"} <ArrowIcon /></button>
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
      setError(reason instanceof ApiError && reason.status === 401 ? "Email hoặc mật khẩu không đúng." : errorMessage(reason, "Không thể đăng nhập."));
    } finally {
      setSaving(false);
    }
  }

  return <>
    <SiteHeader navigate={navigate} />
    <main className="page-shell admin-login-shell">
      <div className="admin-heading">
        <h1>Đăng nhập</h1>
        <p>Đăng nhập để quản lý bài viết.</p>
      </div>
      <form className="admin-form login-form" onSubmit={(event) => void submit(event)}>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        <label className="field-label" htmlFor="admin-email">Email</label>
        <input id="admin-email" type="email" name="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <label className="field-label" htmlFor="admin-password">Mật khẩu</label>
        <input id="admin-password" type="password" name="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="button button-dark" type="submit" disabled={saving}>{saving ? "Đang đăng nhập…" : "Đăng nhập"} <ArrowIcon /></button>
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
    catch (reason) { setError(errorMessage(reason, "Không thể tải bài viết.")); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    let active = true;
    void loadAllPosts(token).then((result) => { if (active) setPosts(result); })
      .catch((reason) => { if (active) setError(errorMessage(reason, "Không thể tải bài viết.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const selectedPost = editingId === null ? undefined : posts.find((post) => post.id === editingId);
  const visiblePosts = useMemo(() => posts.filter((post) => {
    const matchesFilter = filter === "all" || (filter === "published" ? post.isPublished : !post.isPublished);
    const needle = query.trim().toLocaleLowerCase("vi-VN");
    return matchesFilter && (!needle || `${post.title} ${post.slug}`.toLocaleLowerCase("vi-VN").includes(needle));
  }), [posts, filter, query]);

  async function savePost(post: PostRecord | undefined, input: PostInput & { isPublished: boolean }) {
    setEditorError("");
    if (post) {
      try {
        await api.updatePost(post.id, input, token);
        await reload();
        setNotice("Bài viết đã được cập nhật.");
        navigate("/admin");
      } catch (reason) {
        setEditorError(errorMessage(reason, "Không thể cập nhật bài viết."));
      }
      return;
    }

    const userId = userIdFromToken(token);
    if (!userId) {
      setEditorError("Không đọc được mã người dùng từ phiên đăng nhập. Vui lòng đăng nhập lại.");
      return;
    }
    try {
      const { isPublished, ...createInput } = input;
      const created = await api.createPost({ ...createInput, userId }, token);
      if (isPublished) {
        try {
          await api.updatePost(created.id, input, token);
          await reload();
          setNotice("Bài viết đã được tạo và xuất bản.");
        } catch (reason) {
          await reload();
          setNotice(`Bài viết đã được lưu dưới dạng bản nháp nhưng chưa thể xuất bản: ${errorMessage(reason, "Vui lòng thử lại.")}`);
        }
      } else {
        await reload();
        setNotice("Bài viết đã được lưu dưới dạng bản nháp.");
      }
      navigate("/admin");
    } catch (reason) {
      setEditorError(errorMessage(reason, "Không thể tạo bài viết."));
    }
  }

  async function deletePost(post: PostRecord) {
    if (!window.confirm(`Xóa bài viết “${post.title}”? Bình luận thuộc bài viết này cũng sẽ bị xóa.`)) return;
    setDeletingId(post.id);
    setError("");
    try {
      await api.deletePost(post.id, token);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setNotice("Bài viết đã được xóa.");
    } catch (reason) {
      setError(errorMessage(reason, "Không thể xóa bài viết."));
    } finally {
      setDeletingId(null);
    }
  }

  return <>
    <SiteHeader navigate={navigate} admin onLogout={onLogout} />
    <main className="page-shell admin-shell">
      <div className="admin-heading admin-heading-wide">
        <div><h1>{isEditing ? (isNew ? "Bài viết mới" : "Chỉnh sửa bài viết") : "Quản lý bài viết"}</h1></div>
        {!isEditing && <SiteLink to="/admin/posts/new" navigate={navigate} className="button button-dark">Tạo bài viết <ArrowIcon /></SiteLink>}
      </div>

      {isEditing ? <>
        <SiteLink to="/admin" navigate={navigate} className="back-link"><ArrowIcon direction="left" /> Danh sách bài viết</SiteLink>
        {loading && !isNew ? <LoadingRows /> : !isNew && !selectedPost ? <ErrorNotice onRetry={() => void reload()}>{error || "Không tìm thấy bài viết."}</ErrorNotice> : <PostEditor key={selectedPost?.id ?? "new"} post={selectedPost} error={editorError} onSave={savePost} onCancel={() => navigate("/admin")} />}
      </> : <>
        {notice && <p className="success-notice" role="status">{notice}</p>}
        {error && <ErrorNotice onRetry={() => void reload()}>{error}</ErrorNotice>}
        <div className="admin-toolbar">
          <label className="search-field"><span className="sr-only">Tìm theo tiêu đề hoặc đường dẫn</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm bài viết…" /></label>
          <label className="filter-field"><span className="sr-only">Lọc trạng thái</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="published">Đã xuất bản</option><option value="draft">Bản nháp</option></select></label>
        </div>
        {loading ? <LoadingRows /> : visiblePosts.length ? <div className="admin-post-list" aria-busy={deletingId !== null}>
          {visiblePosts.map((post) => <article className="admin-post-row" key={post.id}>
            <div className="admin-post-main"><h2><SiteLink to={`/admin/posts/${post.id}`} navigate={navigate}>{post.title}</SiteLink></h2><p>{post.slug}</p></div>
            <span className={`status-label ${post.isPublished ? "status-published" : "status-draft"}`}>{post.isPublished ? "Đã xuất bản" : "Bản nháp"}</span>
            <time className="admin-date" dateTime={post.updatedAt}>Cập nhật {formatDate(post.updatedAt)}</time>
            <div className="row-actions"><SiteLink to={`/admin/posts/${post.id}`} navigate={navigate} className="text-action">Sửa</SiteLink><button className="text-action text-danger" type="button" onClick={() => void deletePost(post)} disabled={deletingId === post.id}>{deletingId === post.id ? "Đang xóa…" : "Xóa"}</button></div>
          </article>)}
        </div> : <div className="empty-state admin-empty"><h2>{posts.length ? "Không tìm thấy bài viết phù hợp." : "Chưa có bài viết nào."}</h2><p>{posts.length ? "Thử từ khóa hoặc trạng thái khác." : "Tạo bài viết đầu tiên để bắt đầu."}</p>{!posts.length && <SiteLink to="/admin/posts/new" navigate={navigate} className="button button-dark">Tạo bài viết <ArrowIcon /></SiteLink>}</div>}
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
  const [content, setContent] = useState(post?.content ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(post?.coverImageUrl ?? "");
  const [isPublished, setIsPublished] = useState(Boolean(post?.isPublished));
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await onSave(post, { title: title.trim(), slug: slug.trim(), summary: summary.trim(), content: content.trim(), coverImageUrl: coverImageUrl.trim() || null, isPublished });
    setSaving(false);
  }

  return <form className="admin-form editor-form" onSubmit={(event) => void submit(event)}>
    {error && <ErrorNotice>{error}</ErrorNotice>}
    <div className="editor-grid">
      <div className="editor-main-fields">
        <label className="field-label" htmlFor="post-title">Tiêu đề <span>Tối đa 200 ký tự</span></label>
        <input id="post-title" name="title" required maxLength={200} value={title} onChange={(event) => {
          const value = event.target.value;
          setTitle(value);
          if (!slugTouched) setSlug(slugFromTitle(value));
        }} />
        <label className="field-label" htmlFor="post-slug">Đường dẫn <span>Tối đa 200 ký tự</span></label>
        <input id="post-slug" name="slug" required maxLength={200} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" title="Dùng chữ thường không dấu, chữ số và dấu gạch nối." value={slug} onChange={(event) => { setSlugTouched(true); setSlug(event.target.value); }} />
        <p className="field-hint">/posts/{slug || "duong-dan-bai-viet"}</p>
        <label className="field-label" htmlFor="post-summary">Tóm tắt <span>{summary.length}/500</span></label>
        <textarea id="post-summary" name="summary" required maxLength={500} rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} />
        <label className="field-label" htmlFor="post-content">Nội dung</label>
        <textarea id="post-content" name="content" required rows={16} value={content} onChange={(event) => setContent(event.target.value)} />
        <p className="field-hint">Mỗi đoạn văn cách nhau bằng một dòng trống.</p>
      </div>
      <aside className="editor-aside">
        <div className="editor-status">
          <h2>Trạng thái</h2>
          <label className="publish-toggle"><input type="checkbox" checked={!isPublished} onChange={(event) => setIsPublished(!event.target.checked)} /><span>Nháp</span></label>
          <p>{post ? "Thay đổi trạng thái sẽ được lưu cùng bài viết." : "Bài viết mới luôn được lưu dưới dạng bản nháp trước."}</p>
        </div>
        <label className="field-label" htmlFor="post-cover">URL ảnh bìa <span>Không bắt buộc</span></label>
        <input id="post-cover" name="coverImageUrl" type="url" inputMode="url" placeholder="https://" value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} />
        {coverImageUrl && <img className="editor-cover-preview" src={coverImageUrl} alt="Xem trước ảnh bìa" onError={(event) => { event.currentTarget.hidden = true; }} />}
      </aside>
    </div>
    <div className="form-actions"><button type="button" className="button button-quiet" onClick={onCancel}>Hủy</button><button type="submit" className="button button-dark" disabled={saving}>{saving ? "Đang lưu…" : post ? "Lưu thay đổi" : "Tạo bài viết"} <ArrowIcon /></button></div>
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
    <main className="page-shell not-found"><h1>Trang này không tồn tại.</h1><SiteLink to="/" navigate={navigate} className="button button-dark">Về trang bài viết <ArrowIcon /></SiteLink></main>
    <SiteFooter navigate={navigate} />
  </>;
}
