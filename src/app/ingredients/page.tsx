"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useProducts, type ProductDoc } from "@/components/ingredients/useProducts";
import { ProductImage } from "@/components/ingredients/ProductImage";
import { PostBody } from "@/components/blog/PostView";

export default function IngredientsPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-muted">Loading…</p>}>
      <Ingredients />
    </Suspense>
  );
}

function Ingredients() {
  const id = useSearchParams().get("id");
  const items = useProducts();
  const { user } = useAuth();
  if (!items) return <p className="py-20 text-center text-muted">Loading…</p>;
  const item = id ? items.find((p) => p.id === id) : null;

  if (id && !item)
    return (
      <div className="card mx-auto mt-10 max-w-md p-8 text-center">
        <p className="font-semibold">This ingredient isn&apos;t available.</p>
        <Link href="/ingredients" className="mt-3 inline-block text-sm text-[#8fbcf3] hover:underline">
          See all training ingredients
        </Link>
      </div>
    );

  if (item) return <Product item={item} others={items.filter((p) => p.id !== item.id)} canEdit={!!user} />;

  return (
    <div className="pt-6">
      <p className="eyebrow">Training ingredients</p>
      <h1 className="font-display text-4xl font-bold uppercase">What powers Tintin&apos;s game</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.length === 0 && <p className="col-span-full text-sm text-muted">Nothing here yet.</p>}
        {items.map((p) => (
          <Card key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}

function Card({ p }: { p: ProductDoc }) {
  return (
    <Link href={`/ingredients?id=${p.id}`} className="group overflow-hidden rounded-2xl border border-line bg-card transition hover:border-line-2">
      <ProductImage id={p.imageId} alt={p.name} className="aspect-square" />
      <span className="block p-3">
        <span className="line-clamp-2 font-semibold group-hover:text-[#8fbcf3]">{p.name}</span>
        {!p.published && <span className="text-[10px] font-semibold uppercase text-warn">Hidden</span>}
      </span>
    </Link>
  );
}

function Product({ item, others, canEdit }: { item: ProductDoc; others: ProductDoc[]; canEdit: boolean }) {
  return (
    <div className="pt-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/#ingredients" className="text-sm text-ink-2 hover:text-ink">
          ‹ Back
        </Link>
        <span className="flex-1" />
        {canEdit && (
          <Link href={`/studio/ingredient?id=${item.id}`} className="btn btn-ghost">
            Edit
          </Link>
        )}
      </div>
      <article className="card overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <ProductImage id={item.imageId} alt={item.name} className="aspect-square md:aspect-auto md:min-h-[420px]" />
          <div className="p-5 sm:p-8">
            <p className="eyebrow">Training ingredient</p>
            <h1 className="font-display mt-1 text-4xl font-bold uppercase leading-none sm:text-5xl">{item.name}</h1>
            {!item.published && <p className="mt-2 text-xs font-semibold uppercase text-warn">Hidden from visitors</p>}
            <div className="mt-6 border-t border-line pt-6">
              {item.description ? <PostBody content={item.description} /> : <p className="text-sm text-muted">No description yet.</p>}
            </div>
          </div>
        </div>
      </article>
      {others.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-bold uppercase">More training ingredients</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {others.slice(0, 4).map((p) => (
              <Card key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
