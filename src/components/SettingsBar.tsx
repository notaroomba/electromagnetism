import {
  Rewind,
  Pause,
  Play,
  FastForward,
  RotateCcw,
  Calculator,
  ChartScatter,
  Scale,
  Edit3,
  Sparkles,
  Maximize2,
  BookOpen,
  Info,
  Grid3x3,
  Navigation,
  Settings,
  Shield,
  Nfc,
  CircleDashed,
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
    showEquipotentialLines,
    setShowEquipotentialLines,
    showFieldLines,
    setShowFieldLines,
    showVelocityVectors,
    setShowVelocityVectors,
    isPaused,
    setIsPaused,
  } = useSimulation();
  const [implementation, setImplementation] = useState<Implementation>(
    universe.get_implementation()
  );
  const [showTrails, setShowTrails] = useState(universe.get_show_trails());
  const [useQuadtree, setUseQuadtree] = useState(universe.get_use_quadtree());
  const [useMass, setUseMass] = useState(universe.get_mass_calculation());
  const [quadtreeTheta, setQuadtreeTheta] = useState(
    universe.get_quadtree_theta()
  );
  const [collisionsEnabled, setCollisionsEnabled] = useState(
    universe.get_collisions_enabled()
  );

  const previousVelocityVectorsRef = useRef(showVelocityVectors);
  const quadtreeManuallyDisabledRef = useRef(false);

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

  // Track manual changes to velocity vectors while paused
  useEffect(() => {
    if (isPaused) {
      setShowVelocityVectors(true);
      // Update the ref when user manually changes velocity vectors while paused
      previousVelocityVectorsRef.current = showVelocityVectors;
    } else {
      // Restore the previous velocity vector setting when unpaused
      setShowVelocityVectors(previousVelocityVectorsRef.current);
    }
  }, [showVelocityVectors, isPaused]);

  useEffect(() => {
    universe.set_use_quadtree(useQuadtree);
    console.log("Quadtree", useQuadtree ? "enabled" : "disabled");
  }, [useQuadtree]);

  useEffect(() => {
    universe.set_collisions_enabled(collisionsEnabled);
    console.log("Collisions", collisionsEnabled ? "enabled" : "disabled");
    setRender((prev) => prev + 1);
  }, [collisionsEnabled]);

  // Keep local collisions state in sync with the universe when render updates
  useEffect(() => {
    setCollisionsEnabled(universe.get_collisions_enabled());
  }, [render]);

  useEffect(() => {
    universe.set_quadtree_theta(quadtreeTheta);
    console.log("Quadtree theta set to", quadtreeTheta);
  }, [quadtreeTheta]);

  useEffect(() => {
    universe.set_mass_calculation(useMass);
    console.log("Mass calculation", useMass ? "enabled" : "disabled");
    setRender((prev) => prev + 1);
  }, [useMass]);

  // Auto-enable quadtree when particle count reaches 150 (only if not manually disabled)
  useEffect(() => {
    const currentParticleCount = universe.get_particle_count();
    if (
      currentParticleCount >= 150 &&
      !useQuadtree &&
      !quadtreeManuallyDisabledRef.current
    ) {
      setUseQuadtree(true);
      console.log(
        "Quadtree auto-enabled at",
        currentParticleCount,
        "particles"
      );
    }
    // Reset manual disable flag if particle count drops below 150
    if (currentParticleCount < 150) {
      quadtreeManuallyDisabledRef.current = false;
    }
  }, [render]);

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
    // Preserve user toggles across reset
    const prevCollisions = collisionsEnabled;
    const prevUseMass = useMass;

    universe.reset();
    // Restore toggles user expects to persist
    universe.set_collisions_enabled(prevCollisions);
    universe.set_mass_calculation(prevUseMass);
    universe.set_is_paused(isPaused);
    setMultiplier(1);
    universe.set_speed(1.0);
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

  // Add/remove helpers moved to SideBar

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
                setUseMass(!useMass);
                setRender((prev) => prev + 1);
              }}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 ${
                useMass ? "bg-blue-100" : "hover:bg-gray-100"
              }`}
              title={
                useMass
                  ? "Use Mass in Calculations"
                  : "Ignore Mass in Calculations"
              }
            >
              <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => {
                setShowEquipotentialLines(!showEquipotentialLines);
                setRender((prev) => prev + 1);
              }}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 ${
                showEquipotentialLines ? "bg-blue-100" : "hover:bg-gray-100"
              }`}
              title={
                showEquipotentialLines
                  ? "Hide Equipotential Lines"
                  : "Show Equipotential Lines"
              }
            >
              <CircleDashed className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => {
                setShowFieldLines(!showFieldLines);
                setRender((prev) => prev + 1);
              }}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 ${
                showFieldLines ? "bg-blue-100" : "hover:bg-gray-100"
              }`}
              title={showFieldLines ? "Hide Field Lines" : "Show Field Lines"}
            >
              <Nfc className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => {
                setCollisionsEnabled(!collisionsEnabled);
              }}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 ${
                collisionsEnabled ? "bg-blue-100" : "hover:bg-gray-100"
              }`}
              title={
                collisionsEnabled ? "Disable Collisions" : "Enable Collisions"
              }
            >
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
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

          {/* Quadtree Controls */}
          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 border-l border-gray-200 pl-3">
            <button
              onClick={() => {
                const newValue = !useQuadtree;
                setUseQuadtree(newValue);
                console.log(
                  `Quadtree manually ${newValue ? "enabled" : "disabled"}`
                );
                // Track if user manually disabled quadtree when particle count >= 150
                if (!newValue && universe.get_particle_count() >= 150) {
                  quadtreeManuallyDisabledRef.current = true;
                } else if (newValue) {
                  // Reset flag when manually enabled
                  quadtreeManuallyDisabledRef.current = false;
                }
                setRender((prev) => prev + 1);
              }}
              className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 ${
                useQuadtree ? "bg-blue-100" : "hover:bg-gray-100"
              }`}
              title={useQuadtree ? "Quadtree Enabled" : "Quadtree Disabled"}
            >
              <Grid3x3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="flex items-center gap-1">
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
              <input
                type="number"
                value={quadtreeTheta}
                onChange={(e) =>
                  setQuadtreeTheta(parseFloat(e.target.value) || 0.5)
                }
                step="0.1"
                min="0"
                max="2"
                className="w-12 sm:w-16 px-1 py-0.5 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                title="Quadtree Theta (Barnes-Hut threshold)"
                disabled={!useQuadtree}
              />
            </div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
