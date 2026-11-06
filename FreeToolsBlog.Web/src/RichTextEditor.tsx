import { useEffect } from "react";
import DOMPurify from "dompurify";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { toEditorHtml } from "./postContent";

const TextStyleWithFontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize,
        renderHTML: (attributes) => attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
      },
    };
  },
});

export default function RichTextEditor({ initialContent, disabled, onChange }: {
  initialContent: string;
  disabled: boolean;
  onChange: (content: string, isEmpty: boolean) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyleWithFontSize],
    content: DOMPurify.sanitize(toEditorHtml(initialContent)),
    editable: !disabled,
    editorProps: { attributes: { id: "post-content", "aria-label": "Post content" } },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML(), currentEditor.isEmpty),
  });

  useEffect(() => {
    if (editor?.isInitialized) editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (editor?.isInitialized) onChange(editor.getHTML(), editor.isEmpty);
  }, [editor, onChange]);

  const ready = Boolean(editor?.isInitialized);

  return <div className="rich-text-editor">
    <div className="rich-text-toolbar" role="toolbar" aria-label="Text formatting">
      <label className="sr-only" htmlFor="font-size">Text size</label>
      <select id="font-size" aria-label="Text size" value={ready ? editor.getAttributes("textStyle").fontSize ?? "" : ""} onChange={(event) => {
        if (!ready) return;
        const fontSize = event.target.value;
        if (fontSize) editor.chain().focus().setMark("textStyle", { fontSize }).run();
        else editor.chain().focus().unsetMark("textStyle").run();
      }} disabled={!ready || disabled}>
        <option value="">Normal</option>
        <option value="14px">Small</option>
        <option value="18px">Large</option>
        <option value="24px">Extra large</option>
      </select>
      <button type="button" aria-label="Bold" aria-pressed={ready && editor.isActive("bold")} onClick={() => ready && editor.chain().focus().toggleBold().run()} disabled={!ready || disabled}><strong>B</strong></button>
      <button type="button" aria-label="Italic" aria-pressed={ready && editor.isActive("italic")} onClick={() => ready && editor.chain().focus().toggleItalic().run()} disabled={!ready || disabled}><em>I</em></button>
      <button type="button" aria-label="Underline" aria-pressed={ready && editor.isActive("underline")} onClick={() => ready && editor.chain().focus().toggleUnderline().run()} disabled={!ready || disabled}><u>U</u></button>
    </div>
    <EditorContent editor={editor} className="rich-editor-content" />
  </div>;
}
