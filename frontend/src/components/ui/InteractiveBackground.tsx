import { useEffect, useRef } from 'react';

interface InteractiveBackgroundProps {
  dotColor?: string;
  activeColor?: string;
  dotSize?: number;
  spacing?: number;
}

export function InteractiveBackground({
  dotColor = 'rgba(15, 23, 42, 0.05)',
  activeColor = 'rgba(234, 88, 12, 0.25)',
  dotSize = 1.2,
  spacing = 28,
}: InteractiveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = -1000;
    let mouseY = -1000;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.body.addEventListener('mouseleave', handleMouseLeave);

    const radiusThreshold = 120;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / spacing);
      const rows = Math.ceil(height / spacing);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing;
          const y = j * spacing;

          const dx = mouseX - x;
          const dy = mouseY - y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          ctx.beginPath();
          if (dist < radiusThreshold) {
            const factor = 1 - dist / radiusThreshold;
            ctx.arc(x, y, dotSize + factor * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = activeColor;
          } else {
            ctx.arc(x, y, dotSize, 0, Math.PI * 2);
            ctx.fillStyle = dotColor;
          }
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [dotColor, activeColor, dotSize, spacing]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-60"
    />
  );
}
