"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProductImage } from "./ProductImage";
import type { ProductDoc } from "./useProducts";

export function IngredientCarousel({ items }: { items: ProductDoc[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const onScroll = () => {
    const el = ref.current;
    if (el) setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(onScroll, [items.length]);
  const slide = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });
  return (
    <div className="relative">
      <div ref={ref} onScroll={onScroll} className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-1">
        {items.map((p) => (
          <div key={p.id} className="flex w-[62%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-line bg-card sm:w-[36%] lg:w-[23%]">
            <Link href={`/ingredients?id=${p.id}`} aria-label={p.name}>
              <ProductImage id={p.imageId} alt={p.name} className="aspect-square" />
            </Link>
            <div className="flex flex-1 flex-col gap-2 p-3">
              <p className="line-clamp-2 font-semibold leading-snug">{p.name}</p>
              <Link href={`/ingredients?id=${p.id}`} className="mt-auto text-sm font-medium text-[#8fbcf3] hover:underline">
                Know more ›
              </Link>
            </div>
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <>
          <button aria-label="Previous" onClick={() => slide(-1)} disabled={edge.start} className="absolute -left-3 top-[38%] hidden h-10 w-10 place-items-center rounded-full border border-line-2 bg-card-2/95 shadow-lg disabled:hidden sm:grid">
            ‹
          </button>
          <button aria-label="More" onClick={() => slide(1)} disabled={edge.end} className="absolute -right-3 top-[38%] hidden h-10 w-10 place-items-center rounded-full border border-line-2 bg-card-2/95 shadow-lg disabled:hidden sm:grid">
            ›
          </button>
        </>
      )}
    </div>
  );
}
