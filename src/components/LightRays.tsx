import React, { useMemo } from 'react';

// 光线配置
const RAY_COLORS = [
  { ray: 'hsl(292, 91%, 63%, 0.7)', glow: 'hsl(292, 91%, 63%, 0.35)' }, // accent 紫色
  { ray: 'hsl(155, 100%, 50%, 0.55)', glow: 'hsl(155, 100%, 50%, 0.25)' }, // primary 绿色
  { ray: 'hsl(0, 85%, 55%, 0.6)', glow: 'hsl(0, 85%, 55%, 0.3)' }, // brand 红色
  { ray: 'hsl(217, 91%, 60%, 0.55)', glow: 'hsl(217, 91%, 60%, 0.25)' }, // secondary 蓝色
];

const PARTICLE_COLORS = [
  'hsl(292, 91%, 63%, 0.85)',
  'hsl(155, 100%, 50%, 0.85)',
  'hsl(0, 85%, 55%, 0.75)',
  'hsl(217, 91%, 60%, 0.75)',
];

interface RayConfig {
  id: number;
  left: string;
  color: typeof RAY_COLORS[0];
  duration: string;
  delay: string;
  width: string;
  height: string;
}

interface ParticleConfig {
  id: number;
  left: string;
  color: string;
  duration: string;
  delay: string;
  size: string;
}

export const LightRays: React.FC = () => {
  // 生成光线配置
  const rays = useMemo<RayConfig[]>(() => {
    const rayCount = 16;
    return Array.from({ length: rayCount }, (_, i) => ({
      id: i,
      left: `${6 + (i * 88) / rayCount + Math.random() * 4}%`,
      color: RAY_COLORS[i % RAY_COLORS.length],
      duration: `${2 + Math.random() * 2}s`,
      delay: `${Math.random() * 4}s`,
      width: `${2 + Math.random() * 2}px`,
      height: `${100 + Math.random() * 80}px`,
    }));
  }, []);

  // 生成粒子配置
  const particles = useMemo<ParticleConfig[]>(() => {
    const particleCount = 28;
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      left: `${3 + Math.random() * 94}%`,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      duration: `${2.5 + Math.random() * 3}s`,
      delay: `${Math.random() * 6}s`,
      size: `${2 + Math.random() * 3}px`,
    }));
  }, []);

  return (
    <div className="light-rays-container">
      {/* 顶部光晕 */}
      <div className="top-glow" />
      
      {/* 光线 */}
      {rays.map((ray) => (
        <div
          key={`ray-${ray.id}`}
          className="light-ray"
          style={{
            left: ray.left,
            width: ray.width,
            height: ray.height,
            '--ray-color': ray.color.ray,
            '--ray-glow': ray.color.glow,
            '--ray-duration': ray.duration,
            '--ray-delay': ray.delay,
          } as React.CSSProperties}
        />
      ))}
      
      {/* 光粒子 */}
      {particles.map((particle) => (
        <div
          key={`particle-${particle.id}`}
          className="light-particle"
          style={{
            left: particle.left,
            width: particle.size,
            height: particle.size,
            '--particle-color': particle.color,
            '--particle-duration': particle.duration,
            '--particle-delay': particle.delay,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default LightRays;
