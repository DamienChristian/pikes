"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/app/lib/utils";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Start writing...",
  disabled = false,
}: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<InstanceType<typeof import("quill").default> | null>(
    null
  );
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || quillRef.current) return;

    let quillInstance: InstanceType<typeof import("quill").default> | null =
      null;

    // Dynamically import Quill only on the client side
    import("quill").then((QuillModule) => {
      // Import CSS separately
      import("quill/dist/quill.snow.css");

      if (!containerRef.current || quillRef.current) return;

      const Quill = QuillModule.default;

      // Initialize Quill with the container
      quillInstance = new Quill(containerRef.current, {
        theme: "snow",
        placeholder,
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ color: [] }, { background: [] }],
            [{ align: [] }],
            ["blockquote", "code-block"],
            ["link"],
            ["clean"],
          ],
        },
      });

      quillRef.current = quillInstance;

      // Set initial content
      if (content) {
        const delta = quillInstance.clipboard.convert({ html: content });
        quillInstance.setContents(delta);
      }

      // Handle text changes
      quillInstance.on("text-change", () => {
        if (!isUpdatingRef.current && quillInstance) {
          const html = quillInstance.root.innerHTML;
          onChange(html === "<p><br></p>" ? "" : html);
        }
      });
    });

    // Cleanup function
    return () => {
      if (quillInstance) {
        quillInstance.off("text-change");
        quillRef.current = null;
      }
    };
  }, []);

  // Update content when prop changes
  useEffect(() => {
    if (quillRef.current && content !== quillRef.current.root.innerHTML) {
      isUpdatingRef.current = true;
      const delta = quillRef.current.clipboard.convert({ html: content || "" });
      quillRef.current.setContents(delta);
      isUpdatingRef.current = false;
    }
  }, [content]);

  // Handle disabled state
  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.enable(!disabled);
    }
  }, [disabled]);

  return (
    <div
      className={cn(
        "quill-wrapper border rounded-md overflow-hidden bg-background",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      <div ref={containerRef} className="quill-container" />
      <style jsx global>{`
        /* Quill Toolbar Styling */
        .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
          background: hsl(var(--muted) / 0.3) !important;
          padding: 8px !important;
          border-top-left-radius: 6px;
          border-top-right-radius: 6px;
        }

        /* Quill Container Styling */
        .ql-container.ql-snow {
          border: none !important;
          font-family: inherit !important;
          border-bottom-left-radius: 6px;
          border-bottom-right-radius: 6px;
        }

        /* Quill Editor Area */
        .ql-editor {
          min-height: 200px;
          font-size: 14px;
          padding: 12px 15px;
          color: hsl(var(--foreground));
        }

        .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground)) !important;
          font-style: normal;
        }

        /* Fix icon visibility - make icons darker and more visible */
        .ql-snow .ql-stroke {
          stroke: currentColor !important;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .ql-snow .ql-fill {
          fill: currentColor !important;
        }

        .ql-snow.ql-toolbar button,
        .ql-snow .ql-toolbar button {
          width: 28px !important;
          height: 28px !important;
          padding: 3px 5px !important;
          color: hsl(var(--foreground));
        }

        .ql-snow.ql-toolbar button svg,
        .ql-snow .ql-toolbar button svg {
          width: 18px !important;
          height: 18px !important;
        }

        /* Picker Labels - Make text visible */
        .ql-snow .ql-picker {
          color: hsl(var(--foreground));
        }

        .ql-snow .ql-picker-label {
          color: hsl(var(--foreground)) !important;
          border: 1px solid transparent !important;
          padding-left: 8px !important;
          padding-right: 24px !important;
        }

        .ql-snow .ql-picker-label::before {
          color: hsl(var(--foreground)) !important;
        }

        /* Toolbar Button Hover/Active States */
        .ql-snow.ql-toolbar button:hover,
        .ql-snow .ql-toolbar button:hover,
        .ql-snow.ql-toolbar button:focus,
        .ql-snow .ql-toolbar button:focus,
        .ql-snow.ql-toolbar button.ql-active,
        .ql-snow .ql-toolbar button.ql-active {
          color: hsl(var(--primary)) !important;
          background-color: hsl(var(--accent)) !important;
          border-radius: 4px;
        }

        .ql-snow.ql-toolbar .ql-picker-label:hover,
        .ql-snow .ql-toolbar .ql-picker-label:hover,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active,
        .ql-snow .ql-toolbar .ql-picker-label.ql-active {
          color: hsl(var(--primary)) !important;
          background-color: hsl(var(--accent)) !important;
          border-radius: 4px;
        }

        /* Picker Dropdown Options */
        .ql-snow .ql-picker-options {
          background-color: hsl(var(--background)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 6px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          padding: 4px;
        }

        .ql-snow .ql-picker-item {
          color: hsl(var(--foreground)) !important;
        }

        .ql-snow .ql-picker-item:hover,
        .ql-snow .ql-picker-item.ql-selected {
          color: hsl(var(--primary)) !important;
          background-color: hsl(var(--accent)) !important;
        }

        /* Color/Background picker buttons */
        .ql-snow .ql-color-picker .ql-picker-label,
        .ql-snow .ql-icon-picker .ql-picker-label {
          padding: 2px 4px !important;
        }

        .ql-snow .ql-color-picker svg,
        .ql-snow .ql-icon-picker svg {
          width: 18px !important;
          height: 18px !important;
        }

        /* Typography */
        .ql-editor h1,
        .ql-editor h2,
        .ql-editor h3 {
          font-weight: 600;
        }

        .ql-editor h1 {
          font-size: 2em;
          margin: 0.67em 0;
        }

        .ql-editor h2 {
          font-size: 1.5em;
          margin: 0.75em 0;
        }

        .ql-editor h3 {
          font-size: 1.17em;
          margin: 0.83em 0;
        }

        /* Lists */
        .ql-editor ul,
        .ql-editor ol {
          padding-left: 1.5em;
        }

        /* Blockquote */
        .ql-editor blockquote {
          border-left: 4px solid hsl(var(--border));
          padding-left: 16px;
          margin: 8px 0;
          color: hsl(var(--muted-foreground));
        }

        /* Code */
        .ql-editor code {
          background-color: hsl(var(--muted));
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
        }

        .ql-editor pre {
          background-color: hsl(var(--muted));
          padding: 12px;
          border-radius: 6px;
          overflow-x: auto;
        }

        /* Links */
        .ql-editor a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
