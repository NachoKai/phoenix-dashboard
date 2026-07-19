import { useState, useRef, useCallback, useEffect } from "react";
import styled from "styled-components";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";

let popCtx: AudioContext | null = null;

function playPop() {
  if (!popCtx) popCtx = new AudioContext();
  if (popCtx.state === "suspended") popCtx.resume();

  const osc = popCtx.createOscillator();
  const gain = popCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, popCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, popCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.3, popCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, popCtx.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(popCtx.destination);
  osc.start();
  osc.stop(popCtx.currentTime + 0.12);
}

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  wobble: number;
  hue: number;
}

let nextId = 0;

function createBubble(w: number, h: number): Bubble {
  const size = 20 + Math.random() * 30;
  return {
    id: nextId++,
    x: Math.random() * (w - size * 2) + size,
    y: h + size,
    size,
    speed: 0.3 + Math.random() * 0.6,
    wobble: Math.random() * Math.PI * 2,
    hue: 200 + Math.random() * 60,
  };
}

export function BubblePopWidget({}: WidgetProps) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [popped, setPopped] = useState(0);
  const areaRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const w = area.clientWidth;
    const h = area.clientHeight;

    const initial = Array.from({ length: 12 }, () => createBubble(w, h));
    setBubbles(initial);

    const spawner = setInterval(() => {
      if (area) {
        setBubbles(prev =>
          [...prev, createBubble(area.clientWidth, area.clientHeight)].slice(-25),
        );
      }
    }, 1200);

    return () => clearInterval(spawner);
  }, []);

  useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      setBubbles(prev =>
        prev
          .map(b => ({
            ...b,
            y: b.y - b.speed,
            wobble: b.wobble + 0.02,
            x: b.x + Math.sin(b.wobble) * 0.3,
          }))
          .filter(b => b.y + b.size > 0),
      );
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const pop = useCallback((id: number) => {
    playPop();
    setBubbles(prev => prev.filter(b => b.id !== id));
    setPopped(p => p + 1);
  }, []);

  return (
    <WidgetCard title="Bubble Pop" status="success" error={null} dragHandle={true}>
      <Wrapper ref={areaRef} onClick={() => setPopped(0)}>
        <Canvas>
          {bubbles.map(b => (
            <BubbleBtn
              key={b.id}
              style={{
                left: b.x,
                top: b.y,
                width: b.size,
                height: b.size,
                background: `radial-gradient(circle at 35% 30%, hsla(${b.hue}, 80%, 75%, 0.9), hsla(${b.hue + 30}, 70%, 50%, 0.6))`,
                boxShadow: `inset 0 -2px 4px rgba(0,0,0,0.1), 0 0 8px hsla(${b.hue}, 80%, 70%, 0.3)`,
              }}
              onClick={e => {
                e.stopPropagation();
                pop(b.id);
              }}
              aria-label="Pop bubble"
            />
          ))}
        </Canvas>
        <Footer>
          <Count>{popped} popped</Count>
          {popped > 0 && <Hint>Tap counter to reset</Hint>}
        </Footer>
      </Wrapper>
    </WidgetCard>
  );
}

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  min-height: 120px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const Canvas = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
`;

const BubbleBtn = styled.button`
  position: absolute;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
  padding: 0;

  &:active {
    transform: scale(1.25) !important;
  }
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 4px;
  flex-shrink: 0;
`;

const Count = styled.span`
  font-size: clamp(0.5rem, 2.8cqw, 0.75rem);
  color: ${({ theme }) => theme.textMuted};
  font-variant-numeric: tabular-nums;
`;

const Hint = styled.span`
  font-size: clamp(0.45rem, 2.5cqw, 0.65rem);
  color: ${({ theme }) => theme.textMuted};
  opacity: 0.5;
`;
