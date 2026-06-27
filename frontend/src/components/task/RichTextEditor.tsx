import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Code,
  Link as LinkIcon,
  Undo,
  Redo,
} from 'lucide-react';
import { useCallback, useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Add a description...',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-accent underline cursor-pointer' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[80px] px-3 py-2 text-sm text-foreground',
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-outline rounded-lg overflow-hidden bg-card">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-outline bg-subtle">
        <ToolButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold size={14} />
        </ToolButton>
        <ToolButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic size={14} />
        </ToolButton>
        <div className="w-px h-4 bg-outline mx-0.5" />
        <ToolButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading"
        >
          <Heading2 size={14} />
        </ToolButton>
        <ToolButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List size={14} />
        </ToolButton>
        <ToolButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListOrdered size={14} />
        </ToolButton>
        <ToolButton
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code block"
        >
          <Code size={14} />
        </ToolButton>
        <ToolButton active={editor.isActive('link')} onClick={setLink} title="Link">
          <LinkIcon size={14} />
        </ToolButton>
        <div className="w-px h-4 bg-outline mx-0.5" />
        <ToolButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo size={14} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo size={14} />
        </ToolButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolButton({
  children,
  active,
  disabled,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-accent text-white'
          : disabled
            ? 'text-muted-foreground opacity-30'
            : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}
