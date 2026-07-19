import { useRef, useEffect } from "react";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";

interface Ripple {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: string;
}

export function TouchRippleWidget({}: WidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ripples: Ripple[] = [];
    let drops: { x: number; y: number; speed: number; len: number; opacity: number }[] =
      [];
    let animId = 0;

    const resize = () => {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
      drops = Array.from({ length: 50 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 3 + Math.random() * 5,
        len: 8 + Math.random() * 12,
        opacity: 0.15 + Math.random() * 0.25,
      }));
    };
    resize();

    const colors = ["#6fa3ff", "#8ec5fc", "#b8d8ff", "#a8d8ea", "#7ec8e3"];

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "rgba(15, 20, 40, 0.6)");
      gradient.addColorStop(1, "rgba(25, 35, 60, 0.8)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const drop of drops) {
        drop.y += drop.speed;
        if (drop.y > canvas.height + 20) {
          drop.y = -20;
          drop.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.strokeStyle = `rgba(180, 210, 240, ${drop.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 1.5, drop.y - drop.len);
        ctx.stroke();
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 2.5;
        r.alpha -= 0.012;
        if (r.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = r.color.replace("1)", `${r.alpha})`);
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = r.color.replace("1)", `${r.alpha * 0.5})`);
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animId = requestAnimationFrame(animate);
    };
    animate();

    const addRipple = (x: number, y: number) => {
      ripples.push({
        x,
        y,
        radius: 3,
        alpha: 0.9,
        color: colors[Math.floor(Math.random() * colors.length)].replace(")", ", 1)"),
      });
    };

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      addRipple(
        (e.clientX - rect.left) * devicePixelRatio,
        (e.clientY - rect.top) * devicePixelRatio,
      );
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.buttons > 0) {
        const rect = canvas.getBoundingClientRect();
        addRipple(
          (e.clientX - rect.left) * devicePixelRatio,
          (e.clientY - rect.top) * devicePixelRatio,
        );
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <WidgetCard title="Touch Ripple" status="success" error={null} dragHandle={true}>
      <canvas ref={canvasRef} className="touch-ripple" />
    </WidgetCard>
  );
}
