"use client";
import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { blogExtensions } from "@/lib/blog";
import { getImage } from "@/lib/store";

export function PostBody({ content }: { content: string }) {
  const [extensions] = useState(() => blogExtensions());
  const editor = useEditor({ extensions, content: safeParse(content), editable: false, immediatelyRender: false }, [content]);
  return <EditorContent editor={editor} className="prose-tt" />;
}

export function CoverThumb({ id }: { id: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    getImage(id).then((d) => on && setSrc(d));
    return () => {
      on = false;
    };
  }, [id]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span className="block h-full w-full animate-pulse bg-card-2" />;
}

export function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
}
