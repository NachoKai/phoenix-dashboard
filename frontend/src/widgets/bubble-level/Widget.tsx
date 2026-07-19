import { useRef, useEffect, useState } from "react";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function BubbleLevelWidget({}: WidgetProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [supported, setSupported] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!window.DeviceOrientationEvent) {
      setSupported(false);
      return;
    }

    const handler = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;
      const x = Math.max(-30, Math.min(30, gamma)) / 30;
      const y = Math.max(-30, Math.min(30, beta - 90)) / 30;
      setTilt({ x, y });
    };

    const requestPermission = async () => {
      const DeviceOrientationEventAny = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      };
      if (typeof DeviceOrientationEventAny.requestPermission === "function") {
        try {
          const perm = await DeviceOrientationEventAny.requestPermission();
          if (perm !== "granted") {
            setSupported(false);
            return;
          }
        } catch {
          setSupported(false);
          return;
        }
      }
      window.addEventListener("deviceorientation", handler);
    };
    requestPermission();

    return () => window.removeEventListener("deviceorientation", handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
    };
    resize();

    const draw = () => {
      if (canvas.width === 0 || canvas.height === 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = Math.max(Math.min(cx, cy) * 0.85, 10);
      const bx = cx + tilt.x * r * 0.6;
      const by = cy + tilt.y * r * 0.6;
      const isLevel = Math.abs(tilt.x) < 0.05 && Math.abs(tilt.y) < 0.05;

      ctx.save();
      ctx.translate(cx, cy);

      ctx.strokeStyle = cssVar("--border") || "#2a2a3e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = cssVar("--text-muted") || "#a3a3bf";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.moveTo(0, -r);
      ctx.lineTo(0, r);
      ctx.setLineDash([]);
      ctx.restore();

      const bubbleR = Math.max(r * 0.12, 4);
      const grad = ctx.createRadialGradient(
        bx - bubbleR * 0.3,
        by - bubbleR * 0.3,
        0,
        bx,
        by,
        bubbleR,
      );
      if (isLevel) {
        grad.addColorStop(0, "#4ecdc4");
        grad.addColorStop(1, "#2ea89f");
      } else {
        const accent = cssVar("--accent") || "#4260c4";
        const dim = cssVar("--accent-dim") || "#3d5299";
        grad.addColorStop(0, accent);
        grad.addColorStop(1, dim);
      }

      ctx.beginPath();
      ctx.arc(bx, by, bubbleR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      if (isLevel) {
        ctx.strokeStyle = "#4ecdc4";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bx, by, bubbleR * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [tilt]);

  return (
    <WidgetCard title="Bubble Level" status="success" error={null} dragHandle={true}>
      {supported ? (
        <canvas ref={canvasRef} className="bubble-level" />
      ) : (
        <div className="bubble-level__unsupported">
          <p>Device orientation not available</p>
          <p className="bubble-level__sub">Try on a mobile device with Safari/Chrome</p>
        </div>
      )}
    </WidgetCard>
  );
}
