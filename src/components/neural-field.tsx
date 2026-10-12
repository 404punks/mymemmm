"use client";

import { useEffect, useRef } from "react";

type Node = { x: number; y: number; vx: number; vy: number };

export function NeuralField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let raf = 0;
    const nodes: Node[] = Array.from({ length: 28 }, (_, i) => ({
      x: (i * 53) % 100,
      y: (i * 37) % 100,
      vx: ((i % 5) - 2) * 0.03,
      vy: ((i % 7) - 3) * 0.025,
    }));

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      const points = nodes.map((node) => ({
        x: (node.x / 100) * rect.width,
        y: (node.y / 100) * rect.height,
      }));
      ctx.lineWidth = 1;
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            ctx.strokeStyle = `rgba(62, 224, 255, ${0.18 * (1 - dist / 120)})`;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
          }
        }
      }
      points.forEach((point, i) => {
        ctx.beginPath();
        ctx.fillStyle = i % 7 === 0 ? "#8d7cff" : "#d7f7ff";
        ctx.arc(point.x, point.y, i % 7 === 0 ? 3.2 : 2.1, 0, Math.PI * 2);
        ctx.fill();
      });
      if (!reduce) {
        nodes.forEach((node) => {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < 0 || node.x > 100) node.vx *= -1;
          if (node.y < 0 || node.y > 100) node.vy *= -1;
        });
        raf = requestAnimationFrame(draw);
      }
      frame += 1;
      if (frame > 2000) cancelAnimationFrame(raf);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="h-full w-full" aria-hidden />;
}
