"use client";
import { useEffect, useState } from "react";
import { getImage } from "@/lib/store";

/** Product photo from Firestore images/{id}, shown whole (never cropped) */
export function ProductImage({ id, alt, className = "" }: { id: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    getImage(id).then((d) => on && setSrc(d));
    return () => {
      on = false;
    };
  }, [id]);
  return (
    <span className={`relative block overflow-hidden bg-card-2 ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-contain p-3" />
      ) : (
        <span className="absolute inset-0 animate-pulse bg-card-3/40" />
      )}
    </span>
  );
}
