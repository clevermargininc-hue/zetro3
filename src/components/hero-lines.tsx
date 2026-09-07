"use client";

import { useEffect, useRef } from "react";

const SIZE = 36;
const GAP = 14;
const PITCH = SIZE + GAP;
const REACH = 200;

/**
 * Aligned square grid behind the landing headline. The lattice stays square
 * and the whole field slides with the pointer.
 */
export function HeroLines() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, force: 0, tforce: 0, seeded: false };
    let width = 0;
    let height = 0;
    let frame = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!pointer.seeded) {
        pointer.x = pointer.tx = width / 2;
        pointer.y = pointer.ty = height / 2;
        pointer.seeded = true;
      }
    };

    const draw = (time: number) => {
      pointer.x += (pointer.tx - pointer.x) * 0.18;
      pointer.y += (pointer.ty - pointer.y) * 0.18;
      pointer.force += (pointer.tforce - pointer.force) * 0.12;

      context.clearRect(0, 0, width, height);
      context.lineJoin = "miter";
      context.lineCap = "butt";

      const cols = Math.ceil(width / PITCH) + 4;
      const rows = Math.ceil(height / PITCH) + 4;
      const originX = (width - (cols - 1) * PITCH) / 2;
      const originY = (height - (rows - 1) * PITCH) / 2;
      const t = reduceMotion ? 0 : time / 1000;
      const shiftX =
        (pointer.x - width / 2) * 0.12 * Math.max(pointer.force, 0.35) + Math.sin(t * 0.4) * 6;
      const shiftY =
        (pointer.y - height / 2) * 0.12 * Math.max(pointer.force, 0.35) + Math.cos(t * 0.32) * 6;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const homeX = originX + col * PITCH + shiftX;
          const homeY = originY + row * PITCH + shiftY;
          const dx = homeX - pointer.x;
          const dy = homeY - pointer.y;
          const distance = Math.hypot(dx, dy) || 1;
          const falloff = Math.max(0, 1 - distance / REACH) ** 2;
          const size = SIZE + falloff * 8 * pointer.force;
          const left = Math.round(homeX - size / 2) + 0.5;
          const top = Math.round(homeY - size / 2) + 0.5;

          context.fillStyle = `rgba(26, 86, 219, ${0.05 + falloff * 0.1 * pointer.force})`;
          context.fillRect(left, top, size, size);
          context.strokeStyle = `rgba(26, 86, 219, ${0.38 + falloff * 0.4 * pointer.force})`;
          context.lineWidth = 1;
          context.strokeRect(left, top, size, size);
        }
      }
    };

    const loop = (time: number) => {
      draw(time);
      frame = window.requestAnimationFrame(loop);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left - 48 &&
        event.clientX <= rect.right + 48 &&
        event.clientY >= rect.top - 48 &&
        event.clientY <= rect.bottom + 48;

      if (!inside) {
        pointer.tforce = 0;
        return;
      }

      pointer.tx = event.clientX - rect.left;
      pointer.ty = event.clientY - rect.top;
      pointer.tforce = 1;
    };

    const onLeave = () => {
      pointer.tforce = 0;
    };

    resize();
    draw(0);

    if (reduceMotion) {
      return;
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    frame = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{
        maskImage:
          "radial-gradient(78% 72% at 50% 42%, #000 40%, rgba(0,0,0,0.55) 72%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(78% 72% at 50% 42%, #000 40%, rgba(0,0,0,0.55) 72%, transparent 100%)",
      }}
    />
  );
}
