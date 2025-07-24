import DOMPurify from "dompurify";

import { NotebookOutput } from "@/hooks/useNotebookOperations";

interface NotebookOutputItemProps {
  output: NotebookOutput;
  isStreaming?: boolean;
}

// Helper function to process base64 image data
const processImageData = (
  data: string | string[],
  mimeType: string,
): string => {
  try {
    let base64String = "";

    // Handle array format (from notebook output)
    if (Array.isArray(data)) {
      base64String = data.join("");
    } else {
      base64String = String(data);
    }

    // Validate base64 string format before processing
    if (!base64String.trim()) {
      console.warn("Empty base64 data provided");
      return "";
    }

    // Remove all whitespace
    base64String = base64String.replace(/\s/g, "");

    // Check if data already contains a data URI prefix
    if (base64String.startsWith("data:")) {
      return base64String;
    }

    // Check if it already starts with the base64 part only
    if (base64String.startsWith(`${mimeType};base64,`)) {
      return `data:${base64String}`;
    }

    // Add the full data URI prefix
    return `data:${mimeType};base64,${base64String}`;
  } catch (error) {
    console.error("Failed to process image data:", error);
    return ""; // Return empty string instead of potentially breaking the component
  }
};

// Helper function to sanitize HTML content
const sanitizeHTML = (html: string | string[]): string => {
  const htmlString = Array.isArray(html) ? html.join("") : String(html);
  return DOMPurify.sanitize(htmlString, {
    // Allow common notebook output elements
    ALLOWED_TAGS: [
      "div",
      "span",
      "p",
      "br",
      "strong",
      "em",
      "b",
      "i",
      "u",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "td",
      "th",
      "caption",
      "ul",
      "ol",
      "li",
      "dl",
      "dt",
      "dd",
      "pre",
      "code",
      "blockquote",
      "img",
      "svg",
      "path",
      "g",
      "circle",
      "rect",
      "line",
      "polygon",
      "text",
      "a",
      "hr",
      "small",
      "sub",
      "sup",
      "style", // Allow inline styles for notebook outputs
    ],
    ALLOWED_ATTR: [
      "class",
      "id",
      "style",
      "title",
      "alt",
      "src",
      "href",
      "target",
      "width",
      "height",
      "viewBox",
      "xmlns",
      "d",
      "fill",
      "stroke",
      "stroke-width",
      "x",
      "y",
      "dx",
      "dy",
      "r",
      "cx",
      "cy",
      "x1",
      "y1",
      "x2",
      "y2",
      "points",
      "text-anchor",
      "font-family",
      "font-size",
      "font-weight",
    ],
    // Keep safe URLs only
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  });
};

export function NotebookOutputItem({
  output,
  isStreaming = false,
}: NotebookOutputItemProps) {
  const textColorClass = isStreaming ? "text-gray-800" : "";

  if (output.output_type === "stream") {
    return (
      <pre
        className={`text-sm font-mono whitespace-pre-wrap overflow-x-auto max-w-full break-words ${textColorClass}`}
      >
        {Array.isArray(output.text) ? output.text.join("") : output.text}
      </pre>
    );
  }

  if (output.output_type === "execute_result" && output.data) {
    return (
      <div className="space-y-2">
        {/* Handle images */}
        {output.data["image/png"] && (
          <div className="flex justify-center">
            <img
              src={processImageData(
                output.data["image/png"] as string | string[],
                "image/png",
              )}
              alt={isStreaming ? "Live plot output" : "Plot output"}
              className="max-w-full h-auto rounded border"
            />
          </div>
        )}
        {output.data["image/jpeg"] && (
          <div className="flex justify-center">
            <img
              src={processImageData(
                output.data["image/jpeg"] as string | string[],
                "image/jpeg",
              )}
              alt={isStreaming ? "Live plot output" : "Plot output"}
              className="max-w-full h-auto rounded border"
            />
          </div>
        )}
        {output.data["image/svg+xml"] && (
          <div className="flex justify-center">
            <div
              dangerouslySetInnerHTML={{
                __html: sanitizeHTML(
                  Array.isArray(output.data["image/svg+xml"])
                    ? output.data["image/svg+xml"].join("")
                    : (output.data["image/svg+xml"] as string),
                ),
              }}
              className="max-w-full"
            />
          </div>
        )}
        {/* Handle HTML */}
        {output.data["text/html"] && (
          <div
            className="text-sm notebook-output"
            dangerouslySetInnerHTML={{
              __html: sanitizeHTML(
                Array.isArray(output.data["text/html"])
                  ? output.data["text/html"].join("")
                  : (output.data["text/html"] as string),
              ),
            }}
          />
        )}
        {/* Handle text/plain when no other format is available */}
        {output.data["text/plain"] &&
          !output.data["image/png"] &&
          !output.data["image/jpeg"] &&
          !output.data["image/svg+xml"] &&
          !output.data["text/html"] && (
            <div
              className="text-sm"
              dangerouslySetInnerHTML={{
                __html: sanitizeHTML(
                  Array.isArray(output.data["text/plain"])
                    ? output.data["text/plain"].join("")
                    : (output.data["text/plain"] as string),
                ),
              }}
            />
          )}
      </div>
    );
  }

  if (output.output_type === "error") {
    return (
      <pre className="text-sm font-mono text-red-600 whitespace-pre-wrap overflow-x-auto max-w-full break-words max-h-96 overflow-y-auto">
        {output.traceback?.join?.("\n") || output.evalue}
      </pre>
    );
  }

  if (output.output_type === "display_data" && output.data) {
    return (
      <div className="space-y-2">
        {/* Handle images */}
        {output.data["image/png"] && (
          <div className="flex justify-center">
            <img
              src={processImageData(
                output.data["image/png"] as string | string[],
                "image/png",
              )}
              alt="Display output"
              className="max-w-full h-auto rounded border"
            />
          </div>
        )}
        {output.data["image/jpeg"] && (
          <div className="flex justify-center">
            <img
              src={processImageData(
                output.data["image/jpeg"] as string | string[],
                "image/jpeg",
              )}
              alt="Display output"
              className="max-w-full h-auto rounded border"
            />
          </div>
        )}
        {output.data["image/svg+xml"] && (
          <div className="flex justify-center">
            <div
              dangerouslySetInnerHTML={{
                __html: sanitizeHTML(
                  Array.isArray(output.data["image/svg+xml"])
                    ? output.data["image/svg+xml"].join("")
                    : (output.data["image/svg+xml"] as string),
                ),
              }}
              className="max-w-full"
            />
          </div>
        )}
        {/* Handle HTML */}
        {output.data["text/html"] && (
          <div
            className="text-sm notebook-output"
            dangerouslySetInnerHTML={{
              __html: sanitizeHTML(
                Array.isArray(output.data["text/html"])
                  ? output.data["text/html"].join("")
                  : (output.data["text/html"] as string),
              ),
            }}
          />
        )}
        {/* Handle text/plain as HTML fallback */}
        {output.data["text/plain"] &&
          !output.data["image/png"] &&
          !output.data["image/jpeg"] &&
          !output.data["image/svg+xml"] &&
          !output.data["text/html"] && (
            <div
              className="text-sm"
              dangerouslySetInnerHTML={{
                __html: sanitizeHTML(
                  Array.isArray(output.data["text/plain"])
                    ? output.data["text/plain"].join("")
                    : (output.data["text/plain"] as string),
                ),
              }}
            />
          )}
      </div>
    );
  }

  // Return null for unknown output types
  return null;
}
