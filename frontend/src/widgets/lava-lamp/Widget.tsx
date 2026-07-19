import { useRef, useEffect } from "react";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";

interface Blob {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
  hue: number;
}

export function LavaLampWidget({}: WidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let blobs: Blob[] = [];
    let animId = 0;

    const resize = () => {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
      blobs = Array.from({ length: 8 }, (_, i) => ({
        x: canvas.width * 0.2 + Math.random() * canvas.width * 0.6,
        y: canvas.height * (i < 4 ? 1.2 : -0.2),
        r: 20 + Math.random() * 40,
        vy: (i < 4 ? -0.3 : 0.3) * (0.5 + Math.random()),
        phase: Math.random() * Math.PI * 2,
        hue: 300 + Math.random() * 60,
      }));
    };
    resize();

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#1a0533");
      bgGrad.addColorStop(0.5, "#2d1b69");
      bgGrad.addColorStop(1, "#1a0533");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "screen";

      for (const blob of blobs) {
        blob.y += blob.vy;
        blob.phase += 0.008;
        blob.x += Math.sin(blob.phase) * 0.5;
        blob.r = Math.max(blob.r + Math.sin(blob.phase * 0.7) * 0.15, 5);

        if (blob.vy < 0 && blob.y < -blob.r) {
          blob.y = h + blob.r;
          blob.vy = -(0.2 + Math.random() * 0.3);
          blob.x = w * 0.2 + Math.random() * w * 0.6;
          blob.hue = 280 + Math.random() * 80;
        }
        if (blob.vy > 0 && blob.y > h + blob.r) {
          blob.y = -blob.r;
          blob.vy = 0.2 + Math.random() * 0.3;
          blob.x = w * 0.2 + Math.random() * w * 0.6;
          blob.hue = 280 + Math.random() * 80;
        }

        const grad = ctx.createRadialGradient(
          blob.x - blob.r * 0.3,
          blob.y - blob.r * 0.3,
          0,
          blob.x,
          blob.y,
          blob.r,
        );
        const top = `hsla(${blob.hue}, 90%, 65%, 0.6)`;
        const bottom = `hsla(${blob.hue + 40}, 80%, 40%, 0.3)`;

        ctx.beginPath();
        ctx.ellipse(
          blob.x,
          blob.y,
          Math.max(blob.r + Math.sin(blob.phase) * 5, 2),
          Math.max(blob.r, 2),
          0,
          0,
          Math.PI * 2,
        );
        grad.addColorStop(0, top);
        grad.addColorStop(1, bottom);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      const overlay = ctx.createRadialGradient(
        w / 2,
        h / 2,
        0,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.6,
      );
      overlay.addColorStop(0, "rgba(45, 27, 105, 0)");
      overlay.addColorStop(1, "rgba(10, 5, 30, 0.4)");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, w, h);

      animId = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <WidgetCard title="Lava Lamp" status="success" error={null} dragHandle={true}>
      <canvas ref={canvasRef} className="lava-lamp" />
    </WidgetCard>
  );
}
