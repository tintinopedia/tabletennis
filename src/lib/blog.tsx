"use client";
import { useEffect, useState } from "react";
import { Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Youtube from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import { getImage } from "./store";

export type PostDoc = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD, can be in the past
  tags: string[];
  content: string; // TipTap JSON, stringified
  excerpt: string;
  cover?: string | null; // first image id, for list thumbnails
  published: boolean;
  createdAt: number;
  updatedAt: number;
};

export const sortPosts = (a: PostDoc, b: PostDoc) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt;

/* Image whose pixels live in Firestore images/{id} (keeps posts small) */
function StoredImageView({ node, selected }: ReactNodeViewProps) {
  const { id, caption } = node.attrs as { id: string; caption?: string };
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    getImage(id).then((d) => on && setSrc(d));
    return () => {
      on = false;
    };
  }, [id]);
  return (
    <NodeViewWrapper as="figure" className={`tt-figure ${selected ? "is-selected" : ""}`} data-drag-handle>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={caption || ""} />
      ) : (
        <div className="tt-img-loading" />
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </NodeViewWrapper>
  );
}
export const StoredImage = Node.create({
  name: "storedImage",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { id: { default: null }, caption: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "img[data-id]", getAttrs: (el) => ({ id: (el as HTMLElement).getAttribute("data-id") }) }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes({ "data-id": HTMLAttributes.id, alt: HTMLAttributes.caption })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(StoredImageView);
  },
});

export function blogExtensions(placeholder?: string) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"], HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
    }),
    Youtube.configure({ nocookie: true, modestBranding: true, width: 640, height: 360 }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    StoredImage,
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ];
}

/* helpers for list cards */
function walk(n: JSONContent, f: (n: JSONContent) => void) {
  f(n);
  n.content?.forEach((c) => walk(c, f));
}
export function summarize(doc: JSONContent): { excerpt: string; cover: string | null } {
  const parts: string[] = [];
  let cover: string | null = null;
  walk(doc, (n) => {
    if (n.type === "text" && n.text) parts.push(n.text);
    if (n.type === "paragraph" || n.type === "heading") parts.push(" ");
    if (n.type === "storedImage" && !cover) cover = (n.attrs?.id as string) ?? null;
  });
  const text = parts.join("").replace(/\s+/g, " ").trim();
  return { excerpt: text.length > 240 ? text.slice(0, 237).replace(/\s+\S*$/, "") + "…" : text, cover };
}

export const monthKey = (iso: string) => iso.slice(0, 7);
export const monthLabel = (key: string) => new Date(key + "-01T00:00:00").toLocaleDateString("en-GB", { month: "long" });
