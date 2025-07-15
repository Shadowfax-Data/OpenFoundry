import { Check, Clipboard, File } from "lucide-react";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

interface CodeBlockProps {
  children?: React.ReactNode;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ children }) => {
  const child = React.Children.toArray(children)[0] as React.ReactElement<
    React.HTMLProps<HTMLElement>
  > | null;
  const code = child?.props?.children
    ? String(child.props.children).replace(/\n$/, "")
    : "";
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!code || !navigator.clipboard) return;
    navigator.clipboard.writeText(code).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="relative my-4 rounded-md border bg-gray-50">
      <div className="flex items-center justify-between rounded-t-md px-3 py-2 border-b">
        <File size={16} className="text-gray-500" />
        <button
          className="p-1 text-gray-500 hover:text-gray-900"
          onClick={handleCopy}
          disabled={!code}
          title="Copy code"
        >
          {isCopied ? (
            <Check size={16} className="text-green-600" />
          ) : (
            <Clipboard size={16} />
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm">{children}</pre>
    </div>
  );
};

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({
  content,
  className,
}) => {
  return (
    <div className={`min-w-0 w-full ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Customize heading styles
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mb-3 text-gray-900">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mb-2 text-gray-900">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-md font-semibold mb-2 text-gray-900">
              {children}
            </h3>
          ),
          // Customize paragraph styles
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          // Customize list styles
          ul: ({ children }) => (
            <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          // Customize code styles
          code: ({ children, ...props }) => {
            const isInline = !props.className?.includes("language-");
            if (isInline) {
              return (
                <code
                  className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="block bg-transparent text-gray-800 text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Customize pre styles for code blocks
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          // Customize blockquote styles
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 mb-2">
              {children}
            </blockquote>
          ),
          // Customize table styles
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="min-w-full border border-gray-300 rounded">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-200">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 border-b">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm text-gray-700 border-b">
              {children}
            </td>
          ),
          // Customize link styles
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {children}
            </a>
          ),
          // Customize horizontal rule styles
          hr: () => <hr className="my-6 border-t border-gray-300" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
