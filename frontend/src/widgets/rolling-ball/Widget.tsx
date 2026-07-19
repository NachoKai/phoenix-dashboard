import { useRef, useEffect, useState } from "react";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";

export function RollingBallWidget({}: WidgetProps) {
  const [supported, setSupported] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tiltRef = useRef({ x: 0, y: 0 });
  const ballRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const rafRef = useRef(0);

  useEffect(() => {
    if (!window.DeviceOrientationEvent) {
      setSupported(false);
      return;
    }

    const handler = (e: DeviceOrientationEvent) => {
      tiltRef.current = {
        x: Math.max(-45, Math.min(45, e.gamma ?? 0)) / 45,
        y: Math.max(-45, Math.min(45, (e.beta ?? 90) - 90)) / 45,
      };
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
      ballRef.current.x = canvas.width / 2;
      ballRef.current.y = canvas.height / 2;
    };
    resize();

    const trail: { x: number; y: number; a: number }[] = [];
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const tilt = tiltRef.current;
      const ball = ballRef.current;
      const br = Math.max(Math.min(w, h) * 0.04, 4);
      const friction = 0.97;
      const gravity = 3;
      const edge = br;

      ball.vx += tilt.x * gravity;
      ball.vy += tilt.y * gravity;
      ball.vx *= friction;
      ball.vy *= friction;
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x < edge) {
        ball.x = edge;
        ball.vx *= -0.5;
      }
      if (ball.x > w - edge) {
        ball.x = w - edge;
        ball.vx *= -0.5;
      }
      if (ball.y < edge) {
        ball.y = edge;
        ball.vy *= -0.5;
      }
      if (ball.y > h - edge) {
        ball.y = h - edge;
        ball.vy *= -0.5;
      }

      trail.push({ x: ball.x, y: ball.y, a: 1 });
      if (trail.length > 20) trail.shift();
      for (const t of trail) t.a *= 0.92;

      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = "rgba(20, 25, 45, 0.4)";
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < trail.length; i++) {
        const t = trail[i];
        ctx.beginPath();
        ctx.arc(t.x, t.y, br * 0.3 * t.a, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(78, 205, 196, ${t.a * 0.3})`;
        ctx.fill();
      }

      ctx.shadowColor = "rgba(78, 205, 196, 0.5)";
      ctx.shadowBlur = 15;
      const grad = ctx.createRadialGradient(
        ball.x - br * 0.3,
        ball.y - br * 0.3,
        0,
        ball.x,
        ball.y,
        br,
      );
      grad.addColorStop(0, "#7ef0e8");
      grad.addColorStop(0.6, "#4ecdc4");
      grad.addColorStop(1, "#2ea89f");
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, br, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <WidgetCard title="Rolling Ball" status="success" error={null} dragHandle={true}>
      {supported ? (
        <canvas ref={canvasRef} className="rolling-ball" />
      ) : (
        <div className="bubble-level__unsupported">
          <p>Device orientation not available</p>
          <p className="bubble-level__sub">Try on a mobile device with Safari/Chrome</p>
        </div>
      )}
    </WidgetCard>
  );
}
