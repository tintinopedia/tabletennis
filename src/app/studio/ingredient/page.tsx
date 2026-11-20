"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import { Gate } from "@/components/Gate";
import { ConfirmButton, Toggle } from "@/components/ui";
import { Toolbar } from "@/components/blog/Toolbar";
import { safeParse } from "@/components/blog/PostView";
import { useProducts, type ProductDoc } from "@/components/ingredients/useProducts";
import { ProductImage } from "@/components/ingredients/ProductImage";
import { blogExtensions, summarize } from "@/lib/blog";
import { compressImage } from "@/lib/image";
import { newId, put, remove, saveError } from "@/lib/store";

export default function IngredientEditPage() {
  return (
    <Gate title="Training ingredient">
      <Suspense fallback={<p className="py-20 text-center text-muted">Loading…</p>}>
        <Loader />
      </Suspense>
    </Gate>
  );
}

function Loader() {
  const id = useSearchParams().get("id");
  const items = useProducts();
  if (!items) return <p className="py-20 text-center text-muted">Loading…</p>;
  const existing = id ? items.find((p) => p.id === id) : undefined;
  if (id && !existing) return <p className="py-20 text-center text-muted">Ingredient not found.</p>;
  const nextOrder = items.length ? Math.max(...items.map((p) => p.order)) + 1 : 1;
  return <Editor key={id ?? "new"} existing={existing} nextOrder={nextOrder} />;
}

function Editor({ existing, nextOrder }: { existing?: ProductDoc; nextOrder: number }) {
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? "");
  const [imageId, setImageId] = useState(existing?.imageId ?? "");
  const [newImage, setNewImage] = useState<string | null>(null); // data URL, uploaded on save
  const [published, setPublished] = useState(existing?.published ?? true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [extensions] = useState(() => blogExtensions("Describe the product: what it is, why Tintin uses it, how to use it…"));
  const [initial] = useState(() => (existing?.description ? safeParse(existing.description) : ""));
  const editor = useEditor(
    {
      extensions,
      content: initial,
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      editorProps: { attributes: { class: "prose-tt min-h-[280px] outline-none" } },
    },
    []
  );

  const save = async () => {
    if (!editor) return;
    if (!name.trim()) return setErr("Add the product name.");
    if (!imageId && !newImage) return setErr("Upload a product image.");
    setErr(null);
    setBusy(true);
    try {
      let img = imageId;
      if (newImage) {
        img = newId();
        await put("images", img, { data: newImage, createdAt: Date.now() });
      }
      const json = editor.getJSON();
      const id = existing?.id ?? newId();
      const doc: Omit<ProductDoc, "id"> = {
        name: name.trim(),
        imageId: img,
        description: JSON.stringify(json),
        excerpt: summarize(json).excerpt,
        published,
        order: existing?.order ?? nextOrder,
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };
      await put("products", id, doc);
      if (newImage && existing?.imageId && existing.imageId !== img) remove("images", existing.imageId).catch(() => {});
      router.push(`/ingredients?id=${id}`);
    } catch (e) {
      setErr((e as { code?: string }).code ? saveError(e) : (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl pt-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/studio?tab=ingredients" className="text-sm text-ink-2 hover:text-ink">
          ‹ Back to Studio
        </Link>
        <span className="flex-1" />
        {existing && (
          <ConfirmButton
            label="Delete ingredient"
            confirm="Delete this ingredient?"
            onConfirm={async () => {
              await remove("products", existing.id);
              if (existing.imageId) remove("images", existing.imageId).catch(() => {});
              router.push("/studio?tab=ingredients");
            }}
          />
        )}
      </div>

      <div className="card grid gap-5 p-5 sm:grid-cols-[220px_1fr] sm:p-6">
        <div>
          <p className="mb-2 text-sm font-semibold">Product image</p>
          <label className="group relative block cursor-pointer overflow-hidden rounded-2xl border border-dashed border-line-2">
            {newImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={newImage} alt="" className="aspect-square w-full bg-card-2 object-contain p-3" />
            ) : imageId ? (
              <ProductImage id={imageId} alt="" className="aspect-square" />
            ) : (
              <span className="grid aspect-square place-items-center bg-card-2 text-center text-sm text-muted">
                Tap to upload
                <br />
                PNG or JPG
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-paper/80 py-1.5 text-center text-xs font-medium opacity-90">{imageId || newImage ? "Change image" : "Upload image"}</span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  setNewImage(await compressImage(f));
                  if (!name.trim()) setName(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
                  setErr(null);
                } catch (er) {
                  setErr((er as Error).message);
                }
              }}
            />
          </label>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">Product name</span>
            <input className="field mt-1 w-full px-3 py-2 text-base" placeholder="e.g. Butterfly Tenergy 05 FX" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <p className="text-xs text-muted">The carousel on Home shows the image and name. The description below appears on the product&apos;s own page when someone taps Know more.</p>
          <Toggle checked={published} onChange={setPublished} label={published ? "Shown on Home" : "Hidden (only you can see it)"} />
        </div>
      </div>

      <div className="card mt-4">
        {editor && <Toolbar editor={editor} onError={setErr} />}
        <div className="p-5 sm:p-6">
          <p className="eyebrow mb-3">Product description</p>
          <EditorContent editor={editor} />
        </div>
      </div>

      {err && <p className="mt-3 text-sm text-bad">{err}</p>}
      <div className="sticky bottom-[calc(94px+env(safe-area-inset-bottom))] z-20 mt-4 md:bottom-12">
        <div className="card flex items-center gap-3 p-3 shadow-2xl shadow-black/50">
          <span className="flex-1 text-sm text-muted">{existing ? "Editing ingredient" : "New ingredient"}</span>
          <button className="btn btn-primary" disabled={busy || !editor} onClick={save}>
            {busy ? "Saving…" : existing ? "Save changes" : "Save ingredient"}
          </button>
        </div>
      </div>
    </div>
  );
}
