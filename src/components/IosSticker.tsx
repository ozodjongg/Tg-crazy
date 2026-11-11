"use client";

import { useEffect, useId, useRef, type PointerEvent, type ReactNode } from "react";

/**
 * iPhone (iOS Messages) uslubidagi stiker qobig'i:
 * - shakl bo'ylab oq "kesma" chegara (die-cut) va yumshoq soya;
 * - "puffy" yaltirash — yorug'lik manbai kursor/barmoq ortidan yuradi;
 * - kursor bo'yicha 3D egilish, bosilganda ko'tarilib "ko'chish";
 * - yangi stiker chatga "yopishib" tushadi.
 *
 * Effekt SVG filtr orqali qilinadi, shuning uchun rasm (webp), video (webm)
 * va Lottie (tgs) stikerlarning barchasida bir xil ishlaydi.
 */
export function IosSticker({
  size,
  tilt = 0,
  slapSince,
  className = "",
  children,
}: {
  /** Stikerning o'lchami (px) — chegara qalinligi shunga moslanadi */
  size: number;
  /** Doimiy ozgina burilish (gradus), haqiqiy yopishtirilgan stikerdek */
  tilt?: number;
  /** Shu vaqtdan (ms) beri 20 soniya o'tmagan bo'lsa — "yopishish" animatsiyasi */
  slapSince?: number;
  className?: string;
  children: ReactNode;
}) {
  const rawId = useId();
  const id = `ios-sticker-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<SVGFEPointLightElement>(null);

  // Chegara, soya va yaltirash o'lchamga mutanosib
  const outline = Math.max(2, Math.round(size * 0.028));
  const blur = Math.max(1.5, size * 0.02);
  const bump = Math.max(2, size * 0.03);
  const restX = size * 0.25;
  const restY = size * 0.12;
  const lightZ = size * 0.9;

  useEffect(() => {
    const el = rootRef.current;
    if (!el || slapSince === undefined || Date.now() - slapSince > 20_000) return;
    el.classList.add("ios-sticker--slap");
    const done = () => el.classList.remove("ios-sticker--slap");
    el.addEventListener("animationend", done, { once: true });
    return () => el.removeEventListener("animationend", done);
  }, [slapSince]);

  const moveLight = (x: number, y: number) => {
    lightRef.current?.setAttribute("x", String(x));
    lightRef.current?.setAttribute("y", String(y));
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" && e.buttons === 0) return;
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.style.setProperty("--ios-rx", `${((0.5 - py) * 16).toFixed(2)}deg`);
    el.style.setProperty("--ios-ry", `${((px - 0.5) * 16).toFixed(2)}deg`);
    moveLight(px * size, py * size);
  };

  const onLeave = () => {
    const el = rootRef.current;
    if (!el) return;
    el.style.removeProperty("--ios-rx");
    el.style.removeProperty("--ios-ry");
    moveLight(restX, restY);
  };

  return (
    <div
      ref={rootRef}
      className={`ios-sticker ${className}`}
      style={{ width: size, height: size, ["--ios-tilt" as string]: `${tilt}deg` }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerCancel={onLeave}
    >
      <svg width="0" height="0" aria-hidden="true" focusable="false" className="pointer-events-none absolute">
        <filter id={id} x="-20%" y="-20%" width="140%" height="145%" colorInterpolationFilters="sRGB">
          {/* Oq kesma chegara: shaklni kengaytirib, chetlarini silliqlaymiz */}
          <feMorphology in="SourceAlpha" operator="dilate" radius={outline} result="dilated" />
          <feGaussianBlur in="dilated" stdDeviation={0.8} result="dilatedBlur" />
          <feComponentTransfer in="dilatedBlur" result="shape">
            <feFuncA type="linear" slope={2.5} intercept={-0.6} />
          </feComponentTransfer>
          <feFlood floodColor="#ffffff" />
          <feComposite in2="shape" operator="in" result="outline" />
          {/* Qog'ozdan ko'tarilgan soya */}
          <feGaussianBlur in="shape" stdDeviation={blur} />
          <feOffset dy={Math.max(1, size * 0.017)} result="shadowShape" />
          <feFlood floodColor="#000000" floodOpacity={0.26} />
          <feComposite in2="shadowShape" operator="in" result="shadow" />
          {/* "Puffy" yaltirash */}
          <feGaussianBlur in="shape" stdDeviation={bump} result="bump" />
          <feSpecularLighting
            in="bump"
            surfaceScale={4}
            specularConstant={0.75}
            specularExponent={24}
            lightingColor="#ffffff"
            result="spec"
          >
            <fePointLight ref={lightRef} x={restX} y={restY} z={lightZ} />
          </feSpecularLighting>
          <feComposite in="spec" in2="shape" operator="in" result="gloss" />
          <feMerge result="body">
            <feMergeNode in="outline" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
          <feComposite in="gloss" in2="body" operator="arithmetic" k1={0} k2={0.38} k3={1} k4={0} result="lit" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="lit" />
          </feMerge>
        </filter>
      </svg>
      <div className="ios-sticker__art" style={{ filter: `url(#${id})`, padding: outline * 2 }}>
        {children}
      </div>
    </div>
  );
}

/** Xabar ID'si bo'yicha barqaror kichik burilish (−3°…3°). */
export const stickerTilt = (seed: number) => ((Math.abs(seed) * 37) % 7) - 3;
