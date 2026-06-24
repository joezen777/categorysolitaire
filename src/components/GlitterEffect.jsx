import React, { useEffect, useRef } from 'react';

export default function GlitterEffect({ color = '#ffd700', active = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set canvas dimensions to match container
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width || 120;
    canvas.height = rect.height || 180;

    const particles = [];
    const particleCount = 45;

    // Particle logic
    class Particle {
      constructor() {
        this.x = canvas.width / 2 + (Math.random() - 0.5) * (canvas.width * 0.5);
        this.y = canvas.height / 2 + (Math.random() - 0.5) * (canvas.height * 0.5);
        this.size = Math.random() * 4 + 2;
        this.speedX = (Math.random() - 0.5) * 5;
        this.speedY = (Math.random() - 0.7) * 6 - 2; // Upward initial velocity
        this.gravity = 0.15;
        this.color = color;
        this.opacity = 1.0;
        this.fade = Math.random() * 0.02 + 0.015;
        this.angle = Math.random() * Math.PI * 2;
        this.angularSpeed = (Math.random() - 0.5) * 0.25;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedY += this.gravity;
        this.opacity -= this.fade;
        this.angle += this.angularSpeed;
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.globalAlpha = Math.max(0, this.opacity);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;

        // Draw diamond-like sparkle/star
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          ctx.lineTo(0, -this.size);
          ctx.lineTo(this.size * 0.25, -this.size * 0.25);
          ctx.rotate(Math.PI / 2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Spawn particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let allDead = true;

      particles.forEach((p) => {
        if (p.opacity > 0) {
          allDead = false;
          p.update();
          p.draw();
        }
      });

      if (!allDead) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [active, color]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    />
  );
}
