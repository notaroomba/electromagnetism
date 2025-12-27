import { extend, useTick } from "@pixi/react";
import type { Particle, Trail, Universe } from "physics-engine";
import { Container, Graphics } from "pixi.js";
import { useCallback, useRef, useState } from "react";
import { useSimulation } from "../contexts/SimulationContext";

extend({
  Container,
  Graphics,
});

interface SandBoxProps {
  universe: Universe;
}

export default function SandBox({ universe }: SandBoxProps) {
  const {
    selectedParticleIndex,
    setSelectedParticleIndex,
    setIsPropertyEditorOpen,
    render,
    setRender,
    showMoreInfo,
    showVelocityVectors,
    setFps,
  } = useSimulation();

  const [hoveredParticleIndex, setHoveredParticleIndex] = useState<
    number | null
  >(null);
  const [isDraggingParticle, setIsDraggingParticle] = useState(false);
  const fpsCounterRef = useRef({ frames: 0, lastTime: performance.now() });
  const pixiContainerRef = useRef<any>(null);

  // Apply Y-flip to the container instead of viewport
  if (pixiContainerRef.current && pixiContainerRef.current.scale.y !== -1) {
    pixiContainerRef.current.scale.y = -1;
  }

  const handleParticleDragStart = (index: number, event: any) => {
    event.stopPropagation();
    setSelectedParticleIndex(index);
    setIsDraggingParticle(true);
    // Pause simulation while dragging
    universe.set_is_paused(true);
  };

  const handleParticleDrag = (index: number, event: any) => {
    if (!isDraggingParticle || !pixiContainerRef.current) return;

    const localPos = pixiContainerRef.current.toLocal(event.global);

    // Update the particle's position
    universe.update_particle_position(index, localPos.x, localPos.y);
    setRender((prev) => prev + 1);
  };

  const handleParticleDragEnd = () => {
    setIsDraggingParticle(false);
    // Don't automatically resume - let user control pause state
  };

  const drawCallback = useCallback(
    (graphics: any) => {
      graphics.clear();

      const particles = universe.get_particles() as Particle[];
      const trails = universe.get_trails() as Trail[][];
      const isPaused = universe.get_is_paused();

      // Draw trails first (behind particles)
      if (universe.get_show_trails()) {
        for (let i = 0; i < trails.length; i++) {
          const trail = trails[i];

          // Trail alpha is constant now (auto-fade feature removed)
          let trailFadeAlpha = 1.0;

          for (let j = 0; j < trail.length; j++) {
            graphics.setStrokeStyle({
              width: 2,
              color: trail[j].color,
              alpha: ((j + 1) / trail.length) * 0.7 * trailFadeAlpha,
            });
            if (j === 0) {
              graphics.moveTo(trail[j].pos.x, trail[j].pos.y);
            } else {
              graphics.lineTo(trail[j].pos.x, trail[j].pos.y);
            }
            graphics.stroke();
          }
        }
      }

      // Draw force vectors when showVelocityVectors is enabled
      if (showVelocityVectors) {
        for (let i = 0; i < particles.length; i++) {
          const particle = particles[i];
          const velocityMag = Math.sqrt(
            particle.vel.x * particle.vel.x + particle.vel.y * particle.vel.y
          );

          // Draw velocity vector (gray)
          if (velocityMag > 0.01) {
            const velScale = 2;
            const velX = particle.vel.x * velScale;
            const velY = particle.vel.y * velScale;

            graphics.setStrokeStyle({
              width: 3,
              color: 0x4a5568,
              alpha: 1,
              cap: "round",
              join: "round",
            });
            graphics.moveTo(particle.pos.x, particle.pos.y);
            graphics.lineTo(particle.pos.x + velX, particle.pos.y + velY);
            graphics.stroke();

            const arrowSize = 15;
            const arrowAngle = Math.PI / 6;
            const velAngleDir = Math.atan2(velY, velX);
            const tipX = particle.pos.x + velX;
            const tipY = particle.pos.y + velY;
            const arrowOffset = -8;
            const arrowTipX = tipX - Math.cos(velAngleDir) * arrowOffset;
            const arrowTipY = tipY - Math.sin(velAngleDir) * arrowOffset;

            graphics.poly([
              {
                x: arrowTipX,
                y: arrowTipY,
              },
              {
                x: arrowTipX - Math.cos(velAngleDir - arrowAngle) * arrowSize,
                y: arrowTipY - Math.sin(velAngleDir - arrowAngle) * arrowSize,
              },
              {
                x: arrowTipX - Math.cos(velAngleDir + arrowAngle) * arrowSize,
                y: arrowTipY - Math.sin(velAngleDir + arrowAngle) * arrowSize,
              },
            ]);
            graphics.fill({ color: 0x4a5568, alpha: 1 });
          }

          // Draw electric force/acceleration vector (purple)
          // Compute net electrostatic acceleration on this particle
          const k = universe.get_coulomb_constant();
          let accX = 0;
          let accY = 0;
          const qi = particle.charge || 0;
          const mi = particle.mass || 1;

          for (let j = 0; j < particles.length; j++) {
            if (j === i) continue;
            const pj = particles[j];
            const qj = pj.charge || 0;
            const rx = particle.pos.x - pj.pos.x;
            const ry = particle.pos.y - pj.pos.y;
            const distSq = rx * rx + ry * ry;
            const dist = Math.sqrt(distSq);
            if (dist > 1e-6) {
              const forceMag = (k * qi * qj) / distSq;
              const accMag = forceMag / mi;
              accX += accMag * (rx / dist);
              accY += accMag * (ry / dist);
            }
          }

          const forceScale = 100; // visual scaling for clarity
          const eX = accX * forceScale;
          const eY = accY * forceScale;

          if (Math.hypot(eX, eY) > 0.01) {
            graphics.setStrokeStyle({
              width: 3,
              color: 0x8b5cf6,
              alpha: 0.9,
              cap: "round",
              join: "round",
            });
            graphics.moveTo(particle.pos.x, particle.pos.y);
            graphics.lineTo(particle.pos.x + eX, particle.pos.y + eY);
            graphics.stroke();

            // Arrowhead
            const arrowSize = 12;
            const arrowAngle = Math.PI / 6;
            const angle = Math.atan2(eY, eX);
            const tipX = particle.pos.x + eX;
            const tipY = particle.pos.y + eY;

            graphics.poly([
              { x: tipX, y: tipY },
              {
                x: tipX - Math.cos(angle - arrowAngle) * arrowSize,
                y: tipY - Math.sin(angle - arrowAngle) * arrowSize,
              },
              {
                x: tipX - Math.cos(angle + arrowAngle) * arrowSize,
                y: tipY - Math.sin(angle + arrowAngle) * arrowSize,
              },
            ]);
            graphics.fill({ color: 0x8b5cf6, alpha: 0.9 });
          }
        }
      }

      // Draw particles
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        const isSelected = selectedParticleIndex === i;
        const isHovered = hoveredParticleIndex === i && isPaused; // Only show hover when paused

        // Calculate fade alpha based on touching_ground flag
        let fadeAlpha = 1.0;

        // (auto-fade feature removed) -- particles no longer automatically fade/removed when touching ground

        // Draw selection/hover highlight (only when paused)
        if ((isSelected || isHovered) && isPaused) {
          graphics.circle(particle.pos.x, particle.pos.y, particle.radius + 8);
          graphics.fill({
            color: isSelected ? 0xffffff : 0xffaa00,
            alpha: 0.1 * fadeAlpha,
          });
          graphics.stroke({
            width: 3,
            color: isSelected ? 0xffffff : 0xffaa00,
            alpha: (isSelected ? 0.6 : 0.6) * fadeAlpha,
          });
        }

        // Draw particle with fade effect
        graphics.circle(particle.pos.x, particle.pos.y, particle.radius);
        graphics.fill({ color: particle.color, alpha: fadeAlpha });
      }
    },
    [
      universe,
      selectedParticleIndex,
      hoveredParticleIndex,
      render,
      showMoreInfo,
      showVelocityVectors,
    ]
  );

  useTick((delta) => {
    // Calculate FPS
    const counter = fpsCounterRef.current;
    counter.frames++;
    const now = performance.now();
    if (now - counter.lastTime >= 1000) {
      setFps(Math.round((counter.frames * 1000) / (now - counter.lastTime)));
      counter.frames = 0;
      counter.lastTime = now;
    }

    if (universe.get_is_paused()) return;

    setRender((prev) => prev + 1);
    universe.time_step(delta.deltaTime / 60); // Convert to seconds
  });

  return (
    <>
      <pixiContainer
        x={0}
        y={0}
        ref={pixiContainerRef}
        interactive
        onPointerDown={(event: any) => {
          // Only allow interaction when paused
          if (!universe.get_is_paused()) return;

          const localPos = pixiContainerRef.current.toLocal(event.data.global);
          const particles = universe.get_particles() as Particle[];

          // Check if clicked on a particle
          for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            const dx = localPos.x - particle.pos.x;
            const dy = localPos.y - particle.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= particle.radius + 10) {
              setSelectedParticleIndex(i);
              // Only open property editor when paused
              if (universe.get_is_paused()) {
                setIsPropertyEditorOpen(true);
              }
              handleParticleDragStart(i, event);
              return;
            }
          }

          // Clicked on empty space - deselect
          setSelectedParticleIndex(null);
        }}
        onGlobalPointerMove={(event: any) => {
          if (isDraggingParticle && selectedParticleIndex !== null) {
            handleParticleDrag(selectedParticleIndex, event);
          }

          // Only allow hover highlighting when paused
          if (!universe.get_is_paused()) {
            setHoveredParticleIndex(null);
            if (pixiContainerRef.current) {
              pixiContainerRef.current.cursor = "default";
            }
            return;
          }

          if (!isDraggingParticle) {
            // Check if hovering over a particle and update hover state
            const particles = universe.get_particles() as Particle[];
            let hoveringOverParticle = false;
            let hoveredIndex: number | null = null;
            const localPos = pixiContainerRef.current.toLocal(
              event.data.global
            );

            for (let i = particles.length - 1; i >= 0; i--) {
              const particle = particles[i];
              const dx = localPos.x - particle.pos.x;
              const dy = localPos.y - particle.pos.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance <= particle.radius + 10) {
                hoveringOverParticle = true;
                hoveredIndex = i;
                break;
              }
            }

            setHoveredParticleIndex(hoveredIndex);
            if (pixiContainerRef.current) {
              pixiContainerRef.current.cursor = hoveringOverParticle
                ? "grab"
                : "default";
            }
          }
        }}
        onPointerUp={handleParticleDragEnd}
        onPointerUpOutside={handleParticleDragEnd}
      >
        <pixiGraphics draw={drawCallback} />
      </pixiContainer>
    </>
  );
}
