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
    showEquipotentialLines,
    showFieldLines,
    setFps,
  } = useSimulation();

  const [hoveredParticleIndex, setHoveredParticleIndex] = useState<
    number | null
  >(null);
  const [isDraggingParticle, setIsDraggingParticle] = useState(false);
  const fpsCounterRef = useRef({ frames: 0, lastTime: performance.now() });
  const pixiContainerRef = useRef<any>(null);
  const equipSegmentsRef = useRef<
    Record<number, Array<{ x1: number; y1: number; x2: number; y2: number }>>
  >({});
  const equipParticlesSnapshotRef = useRef<{
    px: Float64Array;
    py: Float64Array;
    cq: Float64Array;
  } | null>(null);
  const equipViewportSnapshotRef = useRef<{
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null>(null);

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

          const forceScale = 0.5; // visual scaling for clarity (reduced)
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

      // Draw equipotential contour lines if enabled
      if (showEquipotentialLines && pixiContainerRef.current) {
        const app = (window as any).pixiApp;
        if (app) {
          // Potential levels to contour
          const potentialLevels = [-2, -0.5, -0.2, 0.2, 0.5, 2];

          // Determine world bounds and a reasonable grid step in world space
          const tl = pixiContainerRef.current.toLocal({ x: 0, y: 0 });
          const br = pixiContainerRef.current.toLocal({
            x: app.view.width,
            y: app.view.height,
          });
          const minX = Math.min(tl.x, br.x);
          const maxX = Math.max(tl.x, br.x);
          const minY = Math.min(tl.y, br.y);
          const maxY = Math.max(tl.y, br.y);

          // Convert a screen step (in pixels) to world-space step to keep contour density roughly constant
          const screenStep = 20;
          const local0 = pixiContainerRef.current.toLocal({ x: 0, y: 0 });
          const localStepX = pixiContainerRef.current.toLocal({
            x: screenStep,
            y: 0,
          });
          const localStepY = pixiContainerRef.current.toLocal({
            x: 0,
            y: screenStep,
          });
          let stepWorld =
            (Math.abs(localStepX.x - local0.x) +
              Math.abs(localStepY.y - local0.y)) /
            2;
          if (stepWorld < 5) stepWorld = 5; // avoid extremely fine grids when zoomed in

          // Precompute particle arrays to speed inner loops
          const n = particles.length;
          const px = new Float64Array(n);
          const py = new Float64Array(n);
          const cq = new Float64Array(n);
          for (let i = 0; i < n; i++) {
            px[i] = particles[i].pos.x;
            py[i] = particles[i].pos.y;
            cq[i] = particles[i].charge ?? 0;
          }

          // Make grid adaptive: when more particles or larger views are present, increase stepWorld
          const particleScale = Math.min(1 + n / 100, 4); // scale up spacing when many particles
          stepWorld *= particleScale;

          // Limit grid resolution to avoid huge allocations
          const estimatedGridX = Math.ceil((maxX - minX) / stepWorld) + 1;
          const estimatedGridY = Math.ceil((maxY - minY) / stepWorld) + 1;
          const maxDim = 300;
          if (estimatedGridX > maxDim || estimatedGridY > maxDim) {
            const scaleX = estimatedGridX / maxDim;
            const scaleY = estimatedGridY / maxDim;
            const scale = Math.max(scaleX, scaleY);
            stepWorld *= scale;
          }

          // Reduce level complexity on very dense scenes
          let levelsToUse = potentialLevels;
          if (n > 200) levelsToUse = [-0.2, 0.2];
          else if (n > 80) levelsToUse = [-0.5, -0.2, 0.2, 0.5];

          // Recompute heavy geometry occasionally and cache it. Also only recompute when particles moved significantly.
          const shouldRecomputeHeavy = render % 60 === 0;

          let movedSignificantly = true;
          if (
            equipParticlesSnapshotRef.current &&
            equipParticlesSnapshotRef.current.px.length === n
          ) {
            const old = equipParticlesSnapshotRef.current;
            let maxDistSq = 0;
            for (let k = 0; k < n; k++) {
              const dx = px[k] - old.px[k];
              const dy = py[k] - old.py[k];
              const distSq = dx * dx + dy * dy;
              if (distSq > maxDistSq) maxDistSq = distSq;
              if (Math.abs(cq[k] - old.cq[k]) > 1e-6) {
                maxDistSq = Math.max(maxDistSq, 1e-4);
              }
            }
            movedSignificantly = maxDistSq > 0.25; // moved more than 0.5 world units
          }

          // Detect viewport changes (pan/zoom)
          let viewportChanged = true;
          if (equipViewportSnapshotRef.current) {
            const oldV = equipViewportSnapshotRef.current;
            const dx =
              Math.abs(oldV.minX - minX) +
              Math.abs(oldV.maxX - maxX) +
              Math.abs(oldV.minY - minY) +
              Math.abs(oldV.maxY - maxY);
            viewportChanged = dx > 1; // threshold in world units
          }

          movedSignificantly = movedSignificantly || viewportChanged;

          if (
            shouldRecomputeHeavy ||
            Object.keys(equipSegmentsRef.current).length === 0 ||
            movedSignificantly
          ) {
            const segsByLevel: Record<
              number,
              Array<{ x1: number; y1: number; x2: number; y2: number }>
            > = {};

            // Build a grid of potentials at node points to avoid repeated evaluations
            const gridXCount = Math.max(
              2,
              Math.ceil((maxX - minX) / stepWorld) + 1
            );
            const gridYCount = Math.max(
              2,
              Math.ceil((maxY - minY) / stepWorld) + 1
            );
            const grid: Array<number | null> = new Array(
              gridXCount * gridYCount
            ).fill(null);

            for (let gy = 0; gy < gridYCount; gy++) {
              const wy = minY + gy * stepWorld;
              const rowBase = gy * gridXCount;
              for (let gx = 0; gx < gridXCount; gx++) {
                const wx = minX + gx * stepWorld;
                // Compute potential at this node
                let V = 0;
                let tooClose = false;
                for (let k = 0; k < n; k++) {
                  const dx = wx - px[k];
                  const dy = wy - py[k];
                  const distSq = dx * dx + dy * dy;
                  if (distSq < 15 * 15) {
                    tooClose = true;
                    break;
                  }
                  V += cq[k] / Math.sqrt(distSq);
                }
                grid[rowBase + gx] = tooClose ? null : V;
              }
            }

            for (const level of potentialLevels) {
              const segs: Array<{
                x1: number;
                y1: number;
                x2: number;
                y2: number;
              }> = [];
              for (let gy = 0; gy < gridYCount - 1; gy++) {
                for (let gx = 0; gx < gridXCount - 1; gx++) {
                  const p00 = grid[gy * gridXCount + gx];
                  const p10 = grid[gy * gridXCount + gx + 1];
                  const p01 = grid[(gy + 1) * gridXCount + gx];
                  const p11 = grid[(gy + 1) * gridXCount + gx + 1];

                  if (
                    p00 === null ||
                    p10 === null ||
                    p01 === null ||
                    p11 === null
                  )
                    continue;

                  const wx = minX + gx * stepWorld;
                  const wy = minY + gy * stepWorld;

                  const above = [
                    p00 > level,
                    p10 > level,
                    p01 > level,
                    p11 > level,
                  ];
                  const allSame = above.every((v) => v === above[0]);
                  if (allSame) continue;

                  const crossings: { x: number; y: number }[] = [];

                  if (above[0] !== above[1]) {
                    const t =
                      (level - (p00 as number)) /
                      ((p10 as number) - (p00 as number));
                    crossings.push({ x: wx + t * stepWorld, y: wy });
                  }
                  if (above[2] !== above[3]) {
                    const t =
                      (level - (p01 as number)) /
                      ((p11 as number) - (p01 as number));
                    crossings.push({
                      x: wx + t * stepWorld,
                      y: wy + stepWorld,
                    });
                  }
                  if (above[0] !== above[2]) {
                    const t =
                      (level - (p00 as number)) /
                      ((p01 as number) - (p00 as number));
                    crossings.push({ x: wx, y: wy + t * stepWorld });
                  }
                  if (above[1] !== above[3]) {
                    const t =
                      (level - (p10 as number)) /
                      ((p11 as number) - (p10 as number));
                    crossings.push({
                      x: wx + stepWorld,
                      y: wy + t * stepWorld,
                    });
                  }

                  if (crossings.length >= 2) {
                    segs.push({
                      x1: crossings[0].x,
                      y1: crossings[0].y,
                      x2: crossings[1].x,
                      y2: crossings[1].y,
                    });
                  }
                }
              }
              segsByLevel[level] = segs;
            }

            equipSegmentsRef.current = segsByLevel;
            // Save snapshot for change detection
            equipParticlesSnapshotRef.current = {
              px: new Float64Array(px),
              py: new Float64Array(py),
              cq: new Float64Array(cq),
            };
            equipViewportSnapshotRef.current = { minX, minY, maxX, maxY };
          }

          for (const level of levelsToUse) {
            const segs = equipSegmentsRef.current[level] || [];
            if (segs.length === 0) continue;
            graphics.setStrokeStyle({
              width: 1,
              color: level > 0 ? 0xe53935 : 0x1e88e5,
              alpha: 0.25,
            });
            for (let s = 0; s < segs.length; s++) {
              const seg = segs[s];
              graphics.moveTo(seg.x1, seg.y1);
              graphics.lineTo(seg.x2, seg.y2);
            }
            graphics.stroke();
          }
        }
      }

      // Draw electric field lines if enabled
      if (showFieldLines && pixiContainerRef.current) {
        const app = (window as any).pixiApp;
        if (app) {
          // Determine world bounds for out-of-bounds checking
          const tl = pixiContainerRef.current.toLocal({ x: 0, y: 0 });
          const br = pixiContainerRef.current.toLocal({
            x: app.view.width,
            y: app.view.height,
          });
          const minX = Math.min(tl.x, br.x);
          const maxX = Math.max(tl.x, br.x);
          const minY = Math.min(tl.y, br.y);
          const maxY = Math.max(tl.y, br.y);

          const drawFieldLineFrom = (
            startX: number,
            startY: number,
            angle: number,
            outward: boolean
          ) => {
            const stepSize = 10;
            const maxSteps = 120;

            let x = startX + 20 * Math.cos(angle);
            let y = startY + 20 * Math.sin(angle);

            graphics.setStrokeStyle({ width: 1, color: 0x64748b, alpha: 0.3 });
            graphics.moveTo(x, y);

            for (let s = 0; s < maxSteps; s++) {
              let ex = 0;
              let ey = 0;

              for (const charge of particles) {
                const dx = x - charge.pos.x;
                const dy = y - charge.pos.y;
                const distSq = dx * dx + dy * dy;
                const dist = Math.sqrt(distSq);
                if (dist < 15) {
                  graphics.stroke();
                  return;
                }
                const fieldMag = charge.charge / distSq;
                ex += fieldMag * (dx / dist);
                ey += fieldMag * (dy / dist);
              }

              const mag = Math.sqrt(ex * ex + ey * ey);
              if (mag < 1e-5) break;

              const direction = outward ? 1 : -1;
              x += direction * stepSize * (ex / mag);
              y += direction * stepSize * (ey / mag);

              if (x < minX || x > maxX || y < minY || y > maxY) break;

              graphics.lineTo(x, y);
            }
            graphics.stroke();
          };

          // Draw lines for each charge
          for (const charge of particles) {
            const numLines = 10;
            for (let i = 0; i < numLines; i++) {
              const angle = (2 * Math.PI * i) / numLines;
              drawFieldLineFrom(
                charge.pos.x,
                charge.pos.y,
                angle,
                charge.charge > 0
              );
            }
          }
        }
      }
    },
    [
      universe,
      selectedParticleIndex,
      hoveredParticleIndex,
      render,
      showMoreInfo,
      showVelocityVectors,
      showEquipotentialLines,
      showFieldLines,
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
