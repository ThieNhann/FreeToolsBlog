export function isRichTextHtml(content: string) {
  return /^\s*<(?:p|h[1-6]|ul|ol|blockquote|pre)\b/i.test(content);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function toEditorHtml(content: string) {
  if (isRichTextHtml(content)) return content;
  const paragraphs = content.split(/\r?\n\s*\r?\n/).filter((paragraph) => paragraph.trim());
  return paragraphs.length
    ? paragraphs.map((paragraph) => `<p>${paragraph.split(/\r?\n/).map(escapeHtml).join("<br>")}</p>`).join("")
    : "<p></p>";
}
