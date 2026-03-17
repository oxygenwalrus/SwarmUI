import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Text } from '@mantine/core';
import '@mantine/tiptap/styles.css';

interface PromptEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function PromptEditor({
  label,
  value,
  onChange,
  placeholder = 'Enter your prompt...',
  minHeight = 100,
}: PromptEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getText());
    },
  });

  return (
    <div>
      <Text size="sm" fw={500} mb="xs" c="var(--theme-text-primary)">
        {label}
      </Text>
      <RichTextEditor
        editor={editor}
        styles={(theme) => ({
          root: {
            backgroundColor: 'color-mix(in srgb, var(--theme-gray-7) 88%, transparent)',
            border: '1px solid var(--theme-border-subtle)',
            borderRadius: theme.radius.sm,
            '&:hover': {
              borderColor: 'color-mix(in srgb, var(--theme-gray-0) 16%, var(--theme-border-subtle))',
            },
            '&:focus-within': {
              borderColor: 'var(--theme-focus-ring)',
              boxShadow: '0 0 0 1px color-mix(in srgb, var(--theme-focus-ring) 35%, transparent)',
            },
          },
          content: {
            minHeight: `${minHeight}px`,
            fontSize: theme.fontSizes.sm,
            color: 'var(--theme-text-primary)',
            '& .ProseMirror': {
              padding: theme.spacing.sm,
              minHeight: `${minHeight}px`,
              '& p.is-editor-empty:first-of-type::before': {
                content: `"${placeholder}"`,
                color: 'var(--theme-text-secondary)',
                pointerEvents: 'none',
                height: 0,
                float: 'left',
              },
            },
          },
          toolbar: {
            backgroundColor: 'color-mix(in srgb, var(--theme-gray-8) 90%, transparent)',
            borderBottom: '1px solid var(--theme-border-subtle)',
            padding: theme.spacing.xs,
          },
          control: {
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--theme-text-secondary)',
            '&:hover': {
              backgroundColor: 'color-mix(in srgb, var(--theme-brand) 14%, transparent)',
              color: 'var(--theme-brand)',
            },
            '&[data-active]': {
              backgroundColor: 'color-mix(in srgb, var(--theme-brand) 18%, transparent)',
              color: 'var(--theme-brand)',
            },
          },
        })}
      >
        <RichTextEditor.Toolbar sticky stickyOffset={60}>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Strikethrough />
            <RichTextEditor.ClearFormatting />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>

        <RichTextEditor.Content />
      </RichTextEditor>
    </div>
  );
}
