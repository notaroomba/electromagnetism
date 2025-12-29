import { X, GripVertical } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useSimulation } from "../contexts/SimulationContext";

export default function PropertyEditor() {
  const {
    universe,
    selectedParticleIndex,
    isPropertyEditorOpen,
    setSelectedParticleIndex,
    setIsPropertyEditorOpen,
    render,
    setRender,
  } = useSimulation();

  // Get the selected particle
  const particle = useMemo(() => {
    return selectedParticleIndex !== null
      ? universe.get_particle(selectedParticleIndex)
      : null;
  }, [selectedParticleIndex, universe, render]);

  // Check if mass calculation is enabled
  const isMassCalculationEnabled = universe.get_use_mass_in_calculation();

  const [position, setPosition] = useState({
    x: 10,
    y: 10,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const editorRef = useRef<HTMLDivElement>(null);

  // Local state for input values and errors
  const [massValue, setMassValue] = useState("0.00");
  const [chargeValue, setChargeValue] = useState("0.00");
  const [magnetStrengthValue, setMagnetStrengthValue] = useState("0.00");
  const [radiusValue, setRadiusValue] = useState("0.0");
  const [positionValues, setPositionValues] = useState({
    x: "0.00",
    y: "0.00",
  });
  const [velocityValues, setVelocityValues] = useState({
    x: "0.00",
    y: "0.00",
  });

  // Error states
  const [massError, setMassError] = useState("");
  const [chargeError, setChargeError] = useState("");
  const [magnetStrengthError, setMagnetStrengthError] = useState("");
  const [radiusError, setRadiusError] = useState("");
  const [positionErrors, setPositionErrors] = useState({
    x: "",
    y: "",
  });
  const [velocityErrors, setVelocityErrors] = useState({
    x: "",
    y: "",
  });

  // Track if user is actively editing to prevent auto-formatting
  const [isEditing, setIsEditing] = useState<string | null>(null);

  // Update local values when particle changes, but only if user is not actively editing
  useEffect(() => {
    // console.log("Updating PropertyEditor values from particle:", particle);
    if (particle) {
      if (!isEditing || !isEditing.includes("mass")) {
        setMassValue(particle.mass.toFixed(2));
      }
      if (!isEditing || !isEditing.includes("charge")) {
        setChargeValue(particle.charge.toFixed(2));
      }
      if (!isEditing || !isEditing.includes("magnetStrength")) {
        setMagnetStrengthValue(particle.magnet_strength.toFixed(2));
      }
      if (!isEditing || !isEditing.includes("radius")) {
        setRadiusValue(particle.radius.toFixed(1));
      }
      // Update position fields from particle.pos (unless user editing)
      if (!isEditing || !isEditing.includes("position")) {
        setPositionValues({
          x: particle.pos.x.toFixed(2),
          y: particle.pos.y.toFixed(2),
        });
      }

      // Update velocity fields from particle.vel (unless user editing)
      if (!isEditing || !isEditing.includes("velocity")) {
        setVelocityValues({
          x: particle.vel.x.toFixed(2),
          y: particle.vel.y.toFixed(2),
        });
      }
    }
  }, [particle, selectedParticleIndex, isEditing]); // Update when particle properties or index changes

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

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

  // Validation and update handlers
  const handlePropertyUpdate = (
    property: string,
    value: { x: number; y: number } | number
  ) => {
    if (selectedParticleIndex === null) return;

    switch (property) {
      case "position":
        if (typeof value === "object") {
          universe.update_particle_position(
            selectedParticleIndex,
            value.x,
            value.y
          );
        }
        break;
      case "velocity":
        if (typeof value === "object") {
          universe.update_particle_velocity(
            selectedParticleIndex,
            value.x,
            value.y
          );
        }
        break;
      case "mass":
        if (typeof value === "number") {
          universe.update_particle_mass(selectedParticleIndex, value);
        }
        break;
      case "charge":
        if (typeof value === "number") {
          universe.update_particle_charge(selectedParticleIndex, value);
        }
        break;
      case "magnet_strength":
        if (typeof value === "number") {
          universe.update_particle_magnet_strength(selectedParticleIndex, value);
        }
        break;
      case "radius":
        if (typeof value === "number") {
          universe.update_particle_radius(selectedParticleIndex, value);
        }
        break;
      case "color":
        if (typeof value === "number") {
          universe.update_particle_color(selectedParticleIndex, value);
        }
        break;
    }

    // Trigger a re-render
    setRender((prev) => prev + 1);
  };

  const handleMassChange = (value: string) => {
    setIsEditing("mass");
    setMassValue(value);
    setMassError("");

    if (value === "" || value === "-") return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setMassError("Please enter a valid number");
    } else if (numValue <= 0) {
      setMassError("Mass must be greater than 0");
    } else {
      handlePropertyUpdate("mass", numValue);
    }
  };

  const handleChargeChange = (value: string) => {
    setIsEditing("charge");
    setChargeValue(value);
    setChargeError("");

    if (value === "" || value === "-") return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setChargeError("Please enter a valid number");
    } else {
      handlePropertyUpdate("charge", numValue);
    }
  };

  const handleMagnetStrengthChange = (value: string) => {
    setIsEditing("magnetStrength");
    setMagnetStrengthValue(value);
    setMagnetStrengthError("");

    if (value === "" || value === "-") return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setMagnetStrengthError("Please enter a valid number");
    } else {
      handlePropertyUpdate("magnet_strength", numValue);
    }
  };

  const handleRadiusChange = (value: string) => {
    setIsEditing("radius");
    setRadiusValue(value);
    setRadiusError("");

    if (value === "" || value === "-") return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setRadiusError("Please enter a valid number");
    } else if (numValue <= 0) {
      setRadiusError("Radius must be greater than 0");
    } else {
      handlePropertyUpdate("radius", numValue);
    }
  };

  const handlePositionChange = (axis: "x" | "y", value: string) => {
    setIsEditing(`position-${axis}`);
    setPositionValues((prev) => ({ ...prev, [axis]: value }));
    setPositionErrors((prev) => ({ ...prev, [axis]: "" }));

    if (value === "" || value === "-") return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setPositionErrors((prev) => ({
        ...prev,
        [axis]: "Please enter a valid number",
      }));
    } else {
      // Update the position with current values plus the new axis value
      const currentPos = {
        x: axis === "x" ? numValue : parseFloat(positionValues.x) || 0,
        y: axis === "y" ? numValue : parseFloat(positionValues.y) || 0,
      };
      handlePropertyUpdate("position", currentPos);
    }
  };

  const handleVelocityChange = (axis: "x" | "y", value: string) => {
    setIsEditing(`velocity-${axis}`);
    setVelocityValues((prev) => ({ ...prev, [axis]: value }));
    setVelocityErrors((prev) => ({ ...prev, [axis]: "" }));

    if (value === "" || value === "-") return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setVelocityErrors((prev) => ({
        ...prev,
        [axis]: "Please enter a valid number",
      }));
    } else {
      // Update the velocity with current values plus the new axis value
      const currentVel = {
        x: axis === "x" ? numValue : parseFloat(velocityValues.x) || 0,
        y: axis === "y" ? numValue : parseFloat(velocityValues.y) || 0,
      };
      handlePropertyUpdate("velocity", currentVel);
    }
  };

  if (!isPropertyEditorOpen || !particle) return null;

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
        minHeight:
          typeof window !== "undefined" && window.innerWidth < 640
            ? "auto"
            : "500px",
        zIndex: 1000,
      }}
    >
      {/* Header with drag handle and close button */}
      <div className="flex sticky top-0 items-center justify-between p-2 sm:p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div
          className="flex items-center gap-2 cursor-move flex-1"
          onMouseDown={handleDragStart}
        >
          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 -ml-4 hidden sm:block" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 sm:ml-2">
            Edit Particle{" "}
            {selectedParticleIndex !== null ? selectedParticleIndex + 1 : 0}
            's Properties
          </h2>
        </div>
        <button
          onClick={() => {
            setIsPropertyEditorOpen(false);
            setSelectedParticleIndex(null);
          }}
          className="p-1 hover:bg-gray-200 cursor-pointer rounded transition-all duration-200"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Property fields */}
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Mass m */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2 flex-wrap">
            Mass <span className="text-lg">m</span>:
            {!isMassCalculationEnabled && (
              <span className="text-xs text-gray-400 font-normal">
                (disabled - enable in the settings bar)
              </span>
            )}
          </label>
          <input
            type="text"
            value={massValue}
            onChange={(e) => handleMassChange(e.target.value)}
            onBlur={() => setIsEditing(null)}
            disabled={!isMassCalculationEnabled}
            className={`w-full px-3 py-2.5 sm:py-2 text-base border rounded-md focus:outline-none focus:ring-2 ${
              massError
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            } ${
              !isMassCalculationEnabled
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : ""
            }`}
            placeholder="Mass"
          />
          {massError && (
            <span className="text-xs text-red-600">{massError}</span>
          )}
          {!massError && <span className="text-xs text-gray-500">kg</span>}
        </div>

        {/* Charge */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            Charge <span className="text-lg">q</span>:
          </label>
          <input
            type="text"
            value={chargeValue}
            onChange={(e) => handleChargeChange(e.target.value)}
            onBlur={() => setIsEditing(null)}
            className={`w-full px-3 py-2.5 sm:py-2 text-base border rounded-md focus:outline-none focus:ring-2 ${
              chargeError
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
            placeholder="Charge"
          />
          {chargeError && (
            <span className="text-xs text-red-600">{chargeError}</span>
          )}
          {!chargeError && (
            <span className="text-xs text-gray-500">C (Coulombs)</span>
          )}
        </div>

        {/* Magnet Strength */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            Magnet Strength <span className="text-lg">m</span>:
          </label>
          <input
            type="text"
            value={magnetStrengthValue}
            onChange={(e) => handleMagnetStrengthChange(e.target.value)}
            onBlur={() => setIsEditing(null)}
            className={`w-full px-3 py-2.5 sm:py-2 text-base border rounded-md focus:outline-none focus:ring-2 ${
              magnetStrengthError
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
            placeholder="Magnet Strength"
          />
          {magnetStrengthError && (
            <span className="text-xs text-red-600">{magnetStrengthError}</span>
          )}
          {!magnetStrengthError && (
            <span className="text-xs text-gray-500">T (Tesla)</span>
          )}
        </div>

        {/* Radius */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            Radius <span className="text-lg">r</span>:
          </label>
          <input
            type="text"
            value={radiusValue}
            onChange={(e) => handleRadiusChange(e.target.value)}
            onBlur={() => setIsEditing(null)}
            className={`w-full px-3 py-2.5 sm:py-2 text-base border rounded-md focus:outline-none focus:ring-2 ${
              radiusError
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
            placeholder="Radius"
          />
          {radiusError && (
            <span className="text-xs text-red-600">{radiusError}</span>
          )}
          {!radiusError && (
            <span className="text-xs text-gray-500">pixels</span>
          )}
        </div>

        {/* Position */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            Position:
          </label>

          {/* X Coordinate */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">X:</label>
            <input
              type="text"
              value={positionValues.x}
              onChange={(e) => handlePositionChange("x", e.target.value)}
              onBlur={() => setIsEditing(null)}
              className={`w-full px-3 py-2 text-base border rounded-md focus:outline-none focus:ring-2 ${
                positionErrors.x
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              placeholder="X position"
            />
            {positionErrors.x && (
              <span className="text-xs text-red-600">{positionErrors.x}</span>
            )}
            {!positionErrors.x && (
              <span className="text-xs text-gray-500">m</span>
            )}
          </div>

          {/* Y Coordinate */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Y:</label>
            <input
              type="text"
              value={positionValues.y}
              onChange={(e) => handlePositionChange("y", e.target.value)}
              onBlur={() => setIsEditing(null)}
              className={`w-full px-3 py-2 text-base border rounded-md focus:outline-none focus:ring-2 ${
                positionErrors.y
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              placeholder="Y position"
            />
            {positionErrors.y && (
              <span className="text-xs text-red-600">{positionErrors.y}</span>
            )}
            {!positionErrors.y && (
              <span className="text-xs text-gray-500">m</span>
            )}
          </div>
        </div>

        {/* Velocity */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            Velocity:
          </label>

          {/* X Velocity */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">X:</label>
            <input
              type="text"
              value={velocityValues.x}
              onChange={(e) => handleVelocityChange("x", e.target.value)}
              onBlur={() => setIsEditing(null)}
              className={`w-full px-3 py-2 text-base border rounded-md focus:outline-none focus:ring-2 ${
                velocityErrors.x
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              placeholder="X velocity"
            />
            {velocityErrors.x && (
              <span className="text-xs text-red-600">{velocityErrors.x}</span>
            )}
            {!velocityErrors.x && (
              <span className="text-xs text-gray-500">m/s</span>
            )}
          </div>

          {/* Y Velocity */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Y:</label>
            <input
              type="text"
              value={velocityValues.y}
              onChange={(e) => handleVelocityChange("y", e.target.value)}
              onBlur={() => setIsEditing(null)}
              className={`w-full px-3 py-2 text-base border rounded-md focus:outline-none focus:ring-2 ${
                velocityErrors.y
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              placeholder="Y velocity"
            />
            {velocityErrors.y && (
              <span className="text-xs text-red-600">{velocityErrors.y}</span>
            )}
            {!velocityErrors.y && (
              <span className="text-xs text-gray-500">m/s</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
