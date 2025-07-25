import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import CodeMirror, {
  EditorView,
  ReactCodeMirrorRef,
} from "@uiw/react-codemirror";
import { useCallback, useEffect, useMemo, useRef } from "react";

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  language: "python" | "markdown";
  placeholder?: string;
  readOnly?: boolean;
  theme?: "light" | "dark";
  className?: string;
}

export function CodeMirrorEditor({
  value,
  onChange,
  onExecute,
  language,
  placeholder,
  readOnly = false,
  theme = "light",
  className = "",
}: CodeMirrorEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const extensions = useMemo(() => {
    const exts = [];

    // Add language support
    if (language === "python") {
      exts.push(python());
    } else if (language === "markdown") {
      exts.push(markdown());
    }

    // Add custom keybindings
    if (onExecute) {
      exts.push(
        keymap.of([
          {
            key: "Ctrl-Enter",
            run: () => {
              onExecute();
              return true;
            },
          },
          {
            key: "Cmd-Enter",
            run: () => {
              onExecute();
              return true;
            },
          },
        ]),
      );
    }

    // Editor view configuration
    exts.push(
      EditorView.theme({
        "&": {
          fontSize: "14px",
        },
        ".cm-content": {
          padding: "12px",
          minHeight: "60px",
          fontFamily:
            language === "python"
              ? "ui-monospace, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace"
              : "inherit",
        },
        ".cm-focused": {
          outline: "none",
        },
        ".cm-editor": {
          borderRadius: "6px",
        },
        ".cm-scroller": {
          lineHeight: "1.5",
        },
      }),
    );

    // Line wrapping
    exts.push(EditorView.lineWrapping);

    return exts;
  }, [language, onExecute]);

  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
    },
    [onChange],
  );

  // Focus the editor when it's created
  useEffect(() => {
    if (editorRef.current?.view) {
      editorRef.current.view.focus();
    }
  }, []);

  return (
    <div className={`border rounded-md overflow-hidden ${className}`}>
      <CodeMirror
        ref={editorRef}
        value={value}
        onChange={handleChange}
        extensions={extensions}
        theme={theme === "dark" ? oneDark : undefined}
        placeholder={placeholder}
        editable={!readOnly}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          highlightSelectionMatches: false,
          searchKeymap: false,
        }}
      />
    </div>
  );
}
