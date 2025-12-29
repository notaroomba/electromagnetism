import { X, GripVertical } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSimulation } from "../contexts/SimulationContext";

export default function UniversePropertyEditor() {
  const {
    universe,
    isUniverseEditorOpen,
    setIsUniverseEditorOpen,
    render,
    setRender,
  } = useSimulation();

  const [position, setPosition] = useState({
    x: window.innerWidth - 420,
    y: 10,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDragStart = (e: React.MouseEvent) => {
    if (editorRef.current) {
      const rect = editorRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  // Local state for input values
  const [coulombConstant, setCoulombConstant] = useState(
    universe.get_coulomb_constant().toFixed(2)
  );
  const [defaultMass, setDefaultMass] = useState(
    universe.get_default_mass().toFixed(2)
  );
  const [defaultCharge, setDefaultCharge] = useState(
    universe.get_default_charge().toFixed(2)
  );
  const [speed, setSpeed] = useState(universe.get_speed().toFixed(2));
  const [restitution, setRestitution] = useState(
    universe.get_restitution().toFixed(2)
  );
  const [minDistance, setMinDistance] = useState(
    universe.get_min_interaction_distance().toFixed(2)
  );
  const [spawnRange, setSpawnRange] = useState(
    universe.get_spawn_range().toFixed(2)
  );
  // Update local values when universe changes
  useEffect(() => {
    if (!isEditing) {
      setCoulombConstant(universe.get_coulomb_constant().toFixed(2));
      setDefaultMass(universe.get_default_mass().toFixed(2));
      setDefaultCharge(universe.get_default_charge().toFixed(2));
      setSpeed(universe.get_speed().toFixed(2));
      setRestitution(universe.get_restitution().toFixed(2));
      setMinDistance(universe.get_min_interaction_distance().toFixed(2));
      setSpawnRange(universe.get_spawn_range().toFixed(2));
    }
  }, [universe, render, isEditing]);

  const handlePropertyUpdate = (property: string, value: number | boolean) => {
    switch (property) {
      case "coulombConstant":
        universe.set_coulomb_constant(value as number);
        setCoulombConstant((value as number).toFixed(2));
        break;
      case "defaultCharge":
        universe.set_default_charge(value as number);
        setDefaultCharge((value as number).toFixed(2));
        break;
      case "defaultMass":
        universe.set_default_mass(value as number);
        setDefaultMass((value as number).toFixed(2));
        break;
      case "speed":
        universe.set_speed(value as number);
        setSpeed((value as number).toFixed(2));
        break;
      case "restitution":
        universe.set_restitution(value as number);
        setRestitution((value as number).toFixed(2));
        break;
      case "minDistance":
        universe.set_min_interaction_distance(value as number);
        setMinDistance((value as number).toFixed(2));
        break;
      case "spawnRange":
        universe.set_spawn_range(value as number);
        setSpawnRange((value as number).toFixed(2));
        break;
    }
    setRender((prev) => prev + 1);
  };

  if (!isUniverseEditorOpen) return null;

  return (
    <div
      ref={editorRef}
      className="fixed bg-white border border-gray-200 rounded-lg shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto"
      style={{
        left:
          typeof window !== "undefined" && window.innerWidth < 640
            ? "50%"
            : `${position.x}px`,
        top:
          typeof window !== "undefined" && window.innerWidth < 640
            ? "50%"
            : `${position.y}px`,
        transform:
          typeof window !== "undefined" && window.innerWidth < 640
            ? "translate(-50%, -50%)"
            : "none",
        width:
          typeof window !== "undefined" && window.innerWidth < 640
            ? "90vw"
            : "400px",
        maxWidth: "400px",
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div className="flex sticky top-0 items-center justify-between p-2 sm:p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div
          className="flex items-center gap-2 cursor-move flex-1"
          onMouseDown={handleDragStart}
        >
          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 -ml-4 hidden sm:block" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 sm:ml-2">
            Universe Settings
          </h2>
        </div>
        <button
          onClick={() => setIsUniverseEditorOpen(false)}
          className="p-1 hover:bg-gray-200 cursor-pointer rounded transition-all duration-200"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Property fields */}
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Coulomb constant */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Coulomb constant k:
          </label>
          <input
            type="text"
            value={coulombConstant}
            onChange={(e) => {
              setIsEditing("coulombConstant");
              setCoulombConstant(e.target.value);
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                handlePropertyUpdate("coulombConstant", val);
              }
            }}
            onBlur={() => setIsEditing(null)}
            className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-500">
            (scaled for visualization)
          </span>
        </div>

        {/* Default Charge */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Default Charge (C):
          </label>
          <input
            type="text"
            value={defaultCharge}
            onChange={(e) => {
              setIsEditing("defaultCharge");
              setDefaultCharge(e.target.value);
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                handlePropertyUpdate("defaultCharge", val);
              }
            }}
            onBlur={() => setIsEditing(null)}
            className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-500">Coulombs</span>
        </div>

        {/* Speed */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Simulation Speed:
          </label>
          <input
            type="text"
            value={speed}
            onChange={(e) => {
              setIsEditing("speed");
              setSpeed(e.target.value);
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                handlePropertyUpdate("speed", val);
              }
            }}
            onBlur={() => setIsEditing(null)}
            className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Restitution (0-1):
          </label>
          <input
            type="text"
            value={restitution}
            onChange={(e) => {
              setIsEditing("restitution");
              setRestitution(e.target.value);
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                handlePropertyUpdate("restitution", val);
              }
            }}
            onBlur={() => setIsEditing(null)}
            className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Minimum interaction distance (softening) */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Min Interaction Distance:
          </label>
          <input
            type="text"
            value={minDistance}
            onChange={(e) => {
              setIsEditing("minDistance");
              setMinDistance(e.target.value);
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                handlePropertyUpdate("minDistance", val);
              }
            }}
            onBlur={() => setIsEditing(null)}
            className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-500">
            simulation units (softening)
          </span>
        </div>

        {/* Spawn Range */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Spawn Range (±x units):
          </label>
          <input
            type="text"
            value={spawnRange}
            onChange={(e) => {
              setIsEditing("spawnRange");
              setSpawnRange(e.target.value);
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                handlePropertyUpdate("spawnRange", val);
              }
            }}
            onBlur={() => setIsEditing(null)}
            className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-500">
            Particles added via the UI will be placed randomly within ±this
            range
          </span>
        </div>

        {/* Quadtree settings moved to the Settings bar for quick access */}
      </div>
    </div>
  );
}
