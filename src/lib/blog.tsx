"use client";
import { useEffect, useState } from "react";
import { Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Youtube from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import { TextStyle, Color, FontSize } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
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
    <NodeViewWrapper as="figure" className={`tt-figure-inner ${selected ? "is-selected" : ""}`} data-drag-handle>
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
    return { id: { default: null }, caption: { default: "" }, float: { default: "none" }, size: { default: "100" } };
  },
  parseHTML() {
    return [{ tag: "img[data-id]", getAttrs: (el) => ({ id: (el as HTMLElement).getAttribute("data-id") }) }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes({ "data-id": HTMLAttributes.id, alt: HTMLAttributes.caption })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(StoredImageView, {
      className: "tt-media tt-figure",
      attrs: ({ node }) => ({ "data-float": String(node.attrs.float ?? "none"), "data-size": String(node.attrs.size ?? "100") }),
    });
  },
});

/* YouTube embed that can float left/right with text wrapping */
const TTYoutube = Youtube.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      float: { default: "none", renderHTML: () => ({}) },
      size: { default: "100", renderHTML: () => ({}) },
    };
  },
  renderHTML(props) {
    const out = this.parent!(props) as unknown as [string, Record<string, string>, unknown];
    return [out[0], { ...out[1], class: "tt-media", "data-float": String(props.node.attrs.float ?? "none"), "data-size": String(props.node.attrs.size ?? "100") }, out[2]];
  },
});

/* Table with a configurable line colour, cells with a background colour */
const TTTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      borderColor: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-border-color"),
        renderHTML: (a) => (a.borderColor ? { "data-border-color": a.borderColor, style: `--tt-border: ${a.borderColor}` } : {}),
      },
    };
  },
});
const cellBg = {
  backgroundColor: {
    default: null,
    parseHTML: (el: HTMLElement) => el.style.backgroundColor || null,
    renderHTML: (a: Record<string, unknown>) => (a.backgroundColor ? { style: `background-color: ${a.backgroundColor}` } : {}),
  },
};
const TTCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellBg };
  },
});
const TTHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellBg };
  },
});

export function blogExtensions(placeholder?: string) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"], HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
    }),
    TTYoutube.configure({ nocookie: true, modestBranding: true, width: 640, height: 360 }),
    TextStyle,
    Color,
    FontSize,
    Highlight.configure({ multicolor: true }),
    TTTable.configure({ resizable: false }),
    TableRow,
    TTHeader,
    TTCell,
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
