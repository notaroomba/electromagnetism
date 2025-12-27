import {
  Rewind,
  Pause,
  Play,
  FastForward,
  RotateCcw,
  Calculator,
  ChartScatter,
  Plus,
  Minus,
  Edit3,
  Sparkles,
  Maximize2,
  BookOpen,
  Info,
  Navigation,
  Settings,
  Weight,
} from "lucide-react";
import { Implementation } from "physics-engine";
import { useEffect, useState, useRef } from "react";
import { useSimulation } from "../contexts/SimulationContext";

export default function SettingsBar() {
  const {
    universe,
    render,
    setRender,
    setIsPropertyEditorOpen,
    isPropertyEditorOpen,
    isUniverseEditorOpen,
    setIsUniverseEditorOpen,
    showMoreInfo,
    setShowMoreInfo,
    showVelocityVectors,
    setShowVelocityVectors,
  } = useSimulation();
  const [isPaused, setIsPaused] = useState(universe.get_is_paused());
  const [implementation, setImplementation] = useState<Implementation>(
    universe.get_implementation()
  );
  const [showTrails, setShowTrails] = useState(universe.get_show_trails());
  const [particleCount, setParticleCount] = useState(1);
  const [useMass, setUseMass] = useState(
    universe.get_use_mass_in_calculation()
  );
  // Spawn range: particles will be placed at random x in [-spawnRange, spawnRange]
  const [spawnRange, setSpawnRange] = useState<number>(200);
  // Collisions toggle (moved to SettingsBar)
  const [collisionsEnabled, setCollisionsEnabled] = useState(
    universe.get_collisions_enabled()
  );

  const addIntervalRef = useRef<number | null>(null);
  const removeIntervalRef = useRef<number | null>(null);
  const previousVelocityVectorsRef = useRef(showVelocityVectors);

  // Rust uses speed_multiplier * 10 substeps, so 1x speed = 1.0 in Rust
  const multipliers = [-4, -2, -1, -0.5, -0.25, 0, 0.25, 0.5, 1, 2, 4];
  const [multiplier, setMultiplier] = useState(() => {
    const current = universe.get_speed();
    return current;
  });

  useEffect(() => {
    universe.set_implementation(implementation);
    console.log("Implementation set to", implementation);
  }, [implementation]);

  useEffect(() => {
    universe.set_is_paused(isPaused);
    console.log("Simulation is now", isPaused ? "paused" : "playing");

    if (isPaused) {
      // Store the current velocity vector setting and show vectors when paused
      previousVelocityVectorsRef.current = showVelocityVectors;
      setShowVelocityVectors(true);
    } else {
      // Restore the previous velocity vector setting when unpaused
      setShowVelocityVectors(previousVelocityVectorsRef.current);
    }

    setRender((prev) => prev + 1);
  }, [isPaused]);

  // Track manual changes to velocity vectors while paused
  useEffect(() => {
    if (isPaused) {
      // Update the ref when user manually changes velocity vectors while paused
      previousVelocityVectorsRef.current = showVelocityVectors;
    }
  }, [showVelocityVectors, isPaused]);

  const rewind = () => {
    const currentIndex = multipliers.indexOf(multiplier);
    const newIndex = Math.max(0, currentIndex - 1);
    const newMultiplier = multipliers[newIndex];
    setMultiplier(newMultiplier);
    universe.set_speed(newMultiplier);
    setRender((prev) => prev + 1);
  };

  const fastForward = () => {
    const currentIndex = multipliers.indexOf(multiplier);
    const newIndex = Math.min(multipliers.length - 1, currentIndex + 1);
    const newMultiplier = multipliers[newIndex];
    setMultiplier(newMultiplier);
    universe.set_speed(newMultiplier);
    setRender((prev) => prev + 1);
  };

  const reset = () => {
    const isPaused = universe.get_is_paused();
    universe.reset();
    universe.set_is_paused(isPaused);
    setMultiplier(1);
    universe.set_speed(1.0);
    // refresh UI state after reset
    setCollisionsEnabled(universe.get_collisions_enabled());
    setImplementation(implementation);
    setRender((prev) => prev + 1);
  };

  const resetView = () => {
    // Access the viewport through the stage children
    const app = (window as any).pixiApp;
    if (app && app.stage && app.stage.children) {
      const viewport = app.stage.children.find(
        (child: any) => child.constructor.name === "ViewportWrapper"
      );
      if (viewport) {
        viewport.position.set(app.canvas.width / 2, app.canvas.height / 3);
        viewport.scale.set(1, 1);
        viewport.rotation = 0;
      }
    }
  };

  const addParticles = (count: number) => {
    for (let i = 0; i < count; i++) {
      // Add particles with random velocities
      const px = Math.random() * (spawnRange * 2) - spawnRange;
      universe.add_particle_simple(
        px, // x position randomized within spawnRange
        0, // y position (ground)
        Math.random() * 50 + 30, // vx: 30-80 m/s
        Math.random() * 50 + 30 // vy: 30-80 m/s
      );
    }
    setRender((prev) => prev + 1);
  };

  const removeParticles = (count: number) => {
    for (let i = 0; i < count; i++) {
      universe.pop_particle();
    }
    setRender((prev) => prev + 1);
  };

  const handleAddMouseDown = () => {
    addParticles(particleCount);
    addIntervalRef.current = setInterval(() => {
      addParticles(particleCount);
    }, 200);
  };

  const handleAddMouseUp = () => {
    if (addIntervalRef.current) {
      clearInterval(addIntervalRef.current);
      addIntervalRef.current = null;
    }
  };

  const handleRemoveMouseDown = () => {
    removeParticles(particleCount);
    removeIntervalRef.current = setInterval(() => {
      removeParticles(particleCount);
    }, 200);
  };

  const handleRemoveMouseUp = () => {
    if (removeIntervalRef.current) {
      clearInterval(removeIntervalRef.current);
      removeIntervalRef.current = null;
    }
  };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (addIntervalRef.current) clearInterval(addIntervalRef.current);
      if (removeIntervalRef.current) clearInterval(removeIntervalRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Edit Mode Indicator */}
      {isPaused && (
        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg pointer-events-auto text-center animate-pulse">
          <p className="font-semibold text-sm sm:text-base">
            🎯 Edit Mode Active
          </p>
          <p className="text-xs sm:text-sm opacity-90">
            Click/drag a particle to edit its properties
          </p>
        </div>
      )}

      {/* Settings Bar */}
      <div className="w-fit max-w-full py-2 px-2 sm:px-4 bg-white border pointer-events-auto border-gray-200 rounded-lg shadow-xl overflow-x-auto">
        <div className="flex items-center justify-center divide-x divide-gray-300 flex-wrap sm:flex-nowrap gap-y-2">
          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
            <button
              onClick={() => setImplementation(Implementation.Euler)}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 ${
                implementation === Implementation.Euler
                  ? "bg-blue-100"
                  : "hover:bg-gray-100"
              }`}
              title="Euler Method"
            >
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => setImplementation(Implementation.RK4)}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 ${
                implementation === Implementation.RK4
                  ? "bg-blue-100"
                  : "hover:bg-gray-100"
              }`}
              title="RK4 Method (More Accurate)"
            >
              <ChartScatter className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => setImplementation(Implementation.Verlet)}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 ${
                implementation === Implementation.Verlet
                  ? "bg-blue-100"
                  : "hover:bg-gray-100"
              }`}
              title="Verlet Method"
            >
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
            <button
              onClick={() => {
                const haveTrails = !showTrails;
                setShowTrails(haveTrails);
                universe.set_show_trails(haveTrails);
                setRender((prev) => prev + 1);
              }}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 ${
                showTrails ? "bg-blue-100" : "hover:bg-gray-100"
              }`}
              title={showTrails ? "Trails Visible" : "Trails Hidden"}
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => {
                const newUseMass = !useMass;
                setUseMass(newUseMass);
                universe.set_use_mass_in_calculation(newUseMass);
                setRender((prev) => prev + 1);
              }}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 ${
                useMass ? "bg-blue-100" : "bg-gray-100"
              }`}
              title={
                useMass
                  ? "Mass Affects Acceleration (Realistic)"
                  : "Mass Ignored (All Objects Fall Same)"
              }
            >
              <Weight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => {
                setShowVelocityVectors(!showVelocityVectors);
                setRender((prev) => prev + 1);
              }}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 ${
                showVelocityVectors ? "bg-blue-100" : "hover:bg-gray-100"
              }`}
              title={
                showVelocityVectors
                  ? "Hide Velocity Vectors"
                  : "Show Velocity Vectors"
              }
            >
              <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => {
                setShowMoreInfo(!showMoreInfo);
                setRender((prev) => prev + 1);
              }}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 ${
                showMoreInfo ? "bg-blue-100" : "hover:bg-gray-100"
              }`}
              title={showMoreInfo ? "Hide Info Overlay" : "Show Info Overlay"}
            >
              <Info className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
            <div className="w-8 sm:w-12 text-center text-xs sm:text-base">
              <p>{multiplier}x</p>
            </div>
            <button
              onClick={rewind}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 active:bg-blue-200 hover:bg-gray-100`}
              title="Rewind"
            >
              <Rewind className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded cursor-pointer transition-all duration-200"
              title={isPaused ? "Play" : "Pause"}
            >
              {isPaused ? (
                <Play className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
            <button
              onClick={fastForward}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 active:bg-blue-200 hover:bg-gray-100`}
              title="Fast Forward"
            >
              <FastForward className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={reset}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 active:bg-blue-200 hover:bg-gray-100`}
              title="Reset Simulation"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
            <button
              onMouseDown={handleAddMouseDown}
              onMouseUp={handleAddMouseUp}
              onMouseLeave={handleAddMouseUp}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 active:bg-blue-200 hover:bg-gray-100`}
              title={`Add ${particleCount} Particle(s) (Hold to add continuously)`}
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <input
              type="number"
              value={particleCount}
              onChange={(e) =>
                setParticleCount(Math.max(1, parseInt(e.target.value) || 1))
              }
              min="1"
              max="100"
              className="w-10 sm:w-14 px-1 py-0.5 text-xs sm:text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Number of particles to add/remove"
            />
            {/* Spawn range control */}
            <div className="flex items-center gap-2 ml-2">
              <label className="text-xs hidden sm:block">Spawn ±</label>
              <input
                type="number"
                value={spawnRange}
                onChange={(e) =>
                  setSpawnRange(Math.max(0, parseInt(e.target.value) || 0))
                }
                min={0}
                className="w-16 px-1 py-0.5 text-xs sm:text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                title="Spawn range in simulation units (particles spawn with x in [-range, +range])"
              />
            </div>
            <button
              onMouseDown={handleRemoveMouseDown}
              onMouseUp={handleRemoveMouseUp}
              onMouseLeave={handleRemoveMouseUp}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 active:bg-blue-200 hover:bg-gray-100`}
              title={`Remove ${particleCount} Particle(s) (Hold to remove continuously)`}
            >
              <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
            <button
              onClick={() => {
                const newVal = !collisionsEnabled;
                setCollisionsEnabled(newVal);
                universe.set_collisions_enabled(newVal);
                setRender((prev) => prev + 1);
              }}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 ${
                collisionsEnabled ? "bg-blue-100" : "hover:bg-gray-100"
              }`}
              title={
                collisionsEnabled ? "Collisions Enabled" : "Collisions Disabled"
              }
            >
              <ChartScatter className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => {
                const willOpen = !isPropertyEditorOpen;
                setIsPropertyEditorOpen(willOpen);
                if (willOpen) {
                  setIsPaused(true);
                }
              }}
              className={`p-1.5 sm:p-2 hover:bg-gray-100 rounded cursor-pointer transition-all duration-200 ${
                isPropertyEditorOpen ? "bg-blue-100" : ""
              }`}
              title={
                isPropertyEditorOpen
                  ? "Close Property Editor"
                  : "Open Property Editor"
              }
            >
              <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => {
                const willOpen = !isUniverseEditorOpen;
                setIsUniverseEditorOpen(willOpen);
                if (willOpen) {
                  setIsPaused(true);
                }
              }}
              className={`p-1.5 sm:p-2 hover:bg-gray-100 rounded cursor-pointer transition-all duration-200 ${
                isUniverseEditorOpen ? "bg-blue-100" : ""
              }`}
              title={
                isUniverseEditorOpen
                  ? "Close Universe Settings"
                  : "Open Universe Settings"
              }
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={resetView}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 active:bg-blue-200 hover:bg-gray-100`}
              title="Reset View"
            >
              <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            {/* Auto-fade removed */}
          </div>
        </div>
      </div>
    </div>
  );
}
