import { useRef, useEffect } from "react";
import styled from "styled-components";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";

interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  hue: number;
  phase: number;
  tailPhase: number;
}

function createFish(w: number, h: number): Fish {
  return {
    x: Math.random() * w,
    y: h * 0.2 + Math.random() * h * 0.6,
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.3,
    len: 12 + Math.random() * 16,
    hue: 180 + Math.random() * 100,
    phase: Math.random() * Math.PI * 2,
    tailPhase: Math.random() * Math.PI * 2,
  };
}

interface Particle {
  x: number;
  y: number;
  vy: number;
  alpha: number;
}

export function AquariumWidget({}: WidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let fishes: Fish[] = [];
    let particles: Particle[] = [];
    let animId = 0;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
      if (fishes.length === 0) {
        fishes = Array.from({ length: 4 }, () => createFish(canvas.width, canvas.height));
      }
    };
    resize();

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      time += 0.1 / 60;

      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#0a1628");
      bgGrad.addColorStop(0.4, "#0d2137");
      bgGrad.addColorStop(0.7, "#0f2a3f");
      bgGrad.addColorStop(1, "#0a1a28");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const seafloorGrad = ctx.createLinearGradient(0, h * 0.88, 0, h);
      seafloorGrad.addColorStop(0, "rgba(30, 60, 40, 0.1)");
      seafloorGrad.addColorStop(0.3, "rgba(20, 50, 30, 0.3)");
      seafloorGrad.addColorStop(1, "rgba(15, 35, 25, 0.5)");
      ctx.fillStyle = seafloorGrad;
      ctx.fillRect(0, h * 0.88, w, h * 0.12);

      for (let i = 0; i < 3; i++) {
        const bx = w * 0.15 + i * w * 0.35 + Math.sin(time + i) * 10;
        const by = h * (0.86 + Math.sin(time * 0.5 + i * 2) * 0.02);
        ctx.beginPath();
        ctx.moveTo(bx - 15, by);
        for (let j = 0; j < 8; j++) {
          ctx.lineTo(bx - 15 + j * 4, by + Math.sin(j * 1.2 + time + i) * 4);
        }
        ctx.strokeStyle = "rgba(40, 80, 50, 0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (Math.random() < 0.1) {
        particles.push({
          x: Math.random() * w,
          y: 0,
          vy: 0.2 + Math.random() * 0.4,
          alpha: 0.3 + Math.random() * 0.3,
        });
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.y += p.vy;
        p.alpha -= 0.002;
        if (p.alpha <= 0 || p.y > h) {
          particles.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 220, 255, ${p.alpha})`;
        ctx.fill();
      }

      for (const fish of fishes) {
        fish.x += fish.vx;
        fish.y += fish.vy;
        fish.phase += 0.02;
        fish.tailPhase += 0.06;

        if (fish.x < -30) {
          fish.x = w + 30;
          fish.vx = -(0.3 + Math.random() * 0.5);
        }
        if (fish.x > w + 30) {
          fish.x = -30;
          fish.vx = 0.3 + Math.random() * 0.5;
        }
        if (fish.y < h * 0.1 || fish.y > h * 0.85) fish.vy *= -1;
        fish.vy += Math.sin(fish.phase) * 0.005;

        const flip = fish.vx < 0;
        ctx.save();
        ctx.translate(fish.x, fish.y);
        ctx.scale(flip ? -1 : 1, 1);

        const bodyColor = `hsla(${fish.hue}, 60%, 60%, 0.85)`;
        const finColor = `hsla(${fish.hue + 20}, 50%, 50%, 0.5)`;

        ctx.beginPath();
        ctx.ellipse(0, 0, fish.len * 0.5, fish.len * 0.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = bodyColor;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-fish.len * 0.5, 0);
        ctx.lineTo(-fish.len * 0.7, -fish.len * 0.2 + Math.sin(fish.tailPhase) * 4);
        ctx.lineTo(-fish.len * 0.7, fish.len * 0.2 + Math.sin(fish.tailPhase) * 4);
        ctx.closePath();
        ctx.fillStyle = finColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(fish.len * 0.2, -fish.len * 0.1, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.fill();

        ctx.restore();
      }

      const glow = ctx.createRadialGradient(0, 0, 0, w * 0.2, h * 0.1, w * 0.3);
      glow.addColorStop(0, "rgba(100, 180, 255, 0.03)");
      glow.addColorStop(1, "rgba(100, 180, 255, 0)");
      ctx.fillStyle = glow;
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
    <WidgetCard title="Aquarium" status="success" error={null} dragHandle={true}>
      <Canvas ref={canvasRef} />
    </WidgetCard>
  );
}

const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
  min-height: 120px;
  display: block;
`;
