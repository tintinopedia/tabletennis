"use client";
import Link from "next/link";
import { ConfirmButton, Toggle } from "../ui";
import { useProducts } from "../ingredients/useProducts";
import { ProductImage } from "../ingredients/ProductImage";
import { put, remove } from "@/lib/store";

export function IngredientManager() {
  const items = useProducts() ?? [];
  const swap = async (i: number, j: number) => {
    const a = items[i],
      b = items[j];
    if (!a || !b) return;
    await Promise.all([put("products", a.id, { ...a, order: b.order }), put("products", b.id, { ...b, order: a.order })]);
  };
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
          <h2 className="font-display text-2xl font-bold uppercase">Training ingredients</h2>
          <p className="text-sm text-muted">Products shown in the Training Ingredients carousel on Home. Top of the list shows first.</p>
        </div>
        <Link href="/studio/ingredient" className="btn btn-primary w-full text-center sm:w-auto">
          + New ingredient
        </Link>
      </div>
      <div className="mt-4 space-y-2">
        {items.length === 0 && <p className="text-sm text-muted">No ingredients yet.</p>}
        {items.map((p, i) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card-2/40 p-2">
            <ProductImage id={p.imageId} alt="" className="h-16 w-16 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="truncate text-xs text-muted">{p.excerpt || "No description yet"}</p>
            </div>
            <Toggle checked={p.published} onChange={(v) => put("products", p.id, { ...p, published: v })} label={<span className={`text-xs ${p.published ? "text-good" : "text-muted"}`}>{p.published ? "Shown" : "Hidden"}</span>} />
            <div className="flex items-center gap-1">
              <button aria-label="Move up" disabled={i === 0} className="rounded px-2 py-1 text-ink-2 hover:bg-card-3 disabled:opacity-30" onClick={() => swap(i, i - 1)}>
                ↑
              </button>
              <button aria-label="Move down" disabled={i === items.length - 1} className="rounded px-2 py-1 text-ink-2 hover:bg-card-3 disabled:opacity-30" onClick={() => swap(i, i + 1)}>
                ↓
              </button>
              <Link href={`/studio/ingredient?id=${p.id}`} className="btn btn-ghost !px-3 !py-1 text-xs">
                Edit
              </Link>
              <ConfirmButton
                label="Delete"
                onConfirm={() => {
                  remove("products", p.id);
                  if (p.imageId) remove("images", p.imageId).catch(() => {});
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
