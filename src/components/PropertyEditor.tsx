import { X, GripVertical } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useSimulation } from "../contexts/SimulationContext";

export default function PropertyEditor() {
  const {
    universe,
    selectedParticleIndex,
    selectedMagnetIndex,
    isPropertyEditorOpen,
    setSelectedParticleIndex,
    setSelectedMagnetIndex,
    setIsPropertyEditorOpen,
    render,
    setRender,
  } = useSimulation();

  // Get the selected particle or magnet
  const selectedParticle = useMemo(() => {
    return selectedParticleIndex !== null
      ? universe.get_particle(selectedParticleIndex)
      : null;
  }, [selectedParticleIndex, universe, render]);

  const selectedMagnet = useMemo(() => {
    return selectedMagnetIndex !== null
      ? (universe as any).get_magnet(selectedMagnetIndex)
      : null;
  }, [selectedMagnetIndex, universe, render]);

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
  const [rotationValue, setRotationValue] = useState("0.0");
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
    // Update magnet strength only when a magnet is selected
    if (selectedMagnet) {
      if (!isEditing || !isEditing.includes("magnetStrength")) {
        setMagnetStrengthValue((selectedMagnet.strength ?? 0).toFixed(2));
      }
    } else {
      if (!isEditing || !isEditing.includes("magnetStrength")) {
        setMagnetStrengthValue("0.00");
      }
    }

    if (selectedMagnet) {
      // magnet is selected
      if (!isEditing || !isEditing.includes("mass")) {
        setMassValue(selectedMagnet.mass.toFixed(2));
      }
      if (!isEditing || !isEditing.includes("radius")) {
        // show thickness as the 'radius' field when editing a magnet
        setRadiusValue(
          (selectedMagnet.thickness ?? selectedMagnet.size ?? 10).toFixed(1)
        );
      }
      if (!isEditing || !isEditing.includes("position")) {
        setPositionValues({
          x: selectedMagnet.pos.x.toFixed(2),
          y: selectedMagnet.pos.y.toFixed(2),
        });
      }
      if (!isEditing || !isEditing.includes("velocity")) {
        setVelocityValues({
          x: (selectedMagnet.vel?.x ?? 0).toFixed(2),
          y: (selectedMagnet.vel?.y ?? 0).toFixed(2),
        });
      }
      if (!isEditing || !isEditing.includes("rotation")) {
        setRotationValue(
          ((selectedMagnet.angle ?? 0) * (180.0 / Math.PI)).toFixed(1)
        );
      }
    } else if (selectedParticle) {
      const p = selectedParticle;
      if (!isEditing || !isEditing.includes("mass")) {
        setMassValue(p.mass.toFixed(2));
      }
      if (!isEditing || !isEditing.includes("charge")) {
        setChargeValue((p.charge ?? 0).toFixed(2));
      }
      if (!isEditing || !isEditing.includes("radius")) {
        setRadiusValue((p.radius ?? 10).toFixed(1));
      }
      if (!isEditing || !isEditing.includes("position")) {
        setPositionValues({ x: p.pos.x.toFixed(2), y: p.pos.y.toFixed(2) });
      }
      if (!isEditing || !isEditing.includes("velocity")) {
        setVelocityValues({
          x: (p.vel?.x ?? 0).toFixed(2),
          y: (p.vel?.y ?? 0).toFixed(2),
        });
      }
    }
  }, [selectedParticle, selectedMagnet, selectedParticleIndex, isEditing]); // Update when particle properties or index changes

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
    value: { x: number; y: number } | number | boolean
  ) => {
    // Route to particle/magnet based on current selection
    if (selectedParticleIndex !== null) {
      switch (property) {
        case "position":
          if (typeof value === "object") {
            (universe as any).update_particle_position(
              selectedParticleIndex,
              value.x,
              value.y
            );
          }
          break;
        case "velocity":
          if (typeof value === "object") {
            (universe as any).update_particle_velocity(
              selectedParticleIndex,
              value.x,
              value.y
            );
          }
          break;
        case "mass":
          if (typeof value === "number") {
            (universe as any).update_particle_mass(
              selectedParticleIndex,
              value
            );
          }
          break;
        case "charge":
          if (typeof value === "number") {
            (universe as any).update_particle_charge(
              selectedParticleIndex,
              value
            );
          }
          break;
        case "radius":
          if (typeof value === "number") {
            (universe as any).update_particle_radius(
              selectedParticleIndex,
              value
            );
          }
          break;
        case "color":
          if (typeof value === "number") {
            (universe as any).update_particle_color(
              selectedParticleIndex,
              value
            );
          }
          break;
        case "fixed":
          if (typeof value === "number" || typeof value === "boolean") {
            (universe as any).update_particle_fixed(
              selectedParticleIndex,
              Boolean(value)
            );
          }
          break;
      }
    } else if (selectedMagnetIndex !== null) {
      switch (property) {
        case "position":
          if (typeof value === "object") {
            (universe as any).update_magnet_position(
              selectedMagnetIndex,
              value.x,
              value.y
            );
          }
          break;
        case "velocity":
          if (typeof value === "object") {
            (universe as any).update_magnet_velocity(
              selectedMagnetIndex,
              value.x,
              value.y
            );
          }
          break;
        case "mass":
          if (typeof value === "number") {
            (universe as any).update_magnet_mass(selectedMagnetIndex, value);
          }
          break;
        case "charge":
          if (typeof value === "number") {
            (universe as any).update_magnet_charge
              ? (universe as any).update_magnet_charge(
                  selectedMagnetIndex,
                  value
                )
              : null;
          }
          break;
        case "magnet_strength":
          if (typeof value === "number") {
            (universe as any).update_magnet_strength(
              selectedMagnetIndex,
              value
            );
          }
          break;
        case "angle":
          if (typeof value === "number") {
            (universe as any).update_magnet_angle(selectedMagnetIndex, value);
          }
          break;
        case "radius":
          if (typeof value === "number") {
            // For magnets, this maps to thickness
            (universe as any).update_magnet_thickness(
              selectedMagnetIndex,
              value
            );
          }
          break;
        case "color":
          if (typeof value === "number") {
            (universe as any).update_magnet_color_north(
              selectedMagnetIndex,
              value
            );
          }
          break;
        case "fixed":
          if (typeof value === "number" || typeof value === "boolean") {
            (universe as any).update_magnet_fixed(
              selectedMagnetIndex,
              Boolean(value)
            );
          }
          break;
      }
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

  const handleRotationChange = (value: string) => {
    setIsEditing("rotation");
    setRotationValue(value);

    if (value === "" || value === "-") return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      // ignore invalid input for now
    } else {
      // convert degrees to radians
      const rad = (numValue * Math.PI) / 180.0;
      handlePropertyUpdate("angle", rad);
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

  if (!isPropertyEditorOpen) return null;

  const editingMagnet = selectedMagnetIndex !== null;
  const editingItem = editingMagnet ? selectedMagnet : selectedParticle;
  if (!editingItem) return null;
  const editingIndex = editingMagnet
    ? selectedMagnetIndex
    : selectedParticleIndex;

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
            {editingMagnet ? "Edit Magnet" : "Edit Particle"}{" "}
            {editingIndex !== null && editingIndex !== undefined
              ? editingIndex + 1
              : 0}
            's Properties
          </h2>
        </div>
        <button
          onClick={() => {
            setIsPropertyEditorOpen(false);
            setSelectedParticleIndex(null);
            setSelectedMagnetIndex(null);
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

        {/* Charge (particles only) */}
        {!editingMagnet && (
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
        )}

        {/* Magnet Strength (magnets only) */}
        {editingMagnet && (
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
              <span className="text-xs text-red-600">
                {magnetStrengthError}
              </span>
            )}
            {!magnetStrengthError && (
              <span className="text-xs text-gray-500">T (Tesla)</span>
            )}
          </div>
        )}

        {/* Rotation */}
        {editingMagnet && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              Rotation
            </label>
            <input
              type="text"
              value={rotationValue}
              onChange={(e) => handleRotationChange(e.target.value)}
              onBlur={() => setIsEditing(null)}
              className={`w-full px-3 py-2.5 sm:py-2 text-base border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500`}
              placeholder="Degrees"
            />
            <span className="text-xs text-gray-500">degrees</span>
          </div>
        )}

        {/* Radius / Thickness (particles vs magnets) */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            {editingMagnet ? "Thickness" : "Radius"}{" "}
            <span className="text-lg">r</span>:
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
            placeholder={editingMagnet ? "Thickness" : "Radius"}
          />
          {radiusError && (
            <span className="text-xs text-red-600">{radiusError}</span>
          )}
          {!radiusError && (
            <span className="text-xs text-gray-500">pixels</span>
          )}
        </div>

        {/* Fixed (checkbox) */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            Fixed:
          </label>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={
                  editingMagnet
                    ? selectedMagnet
                      ? selectedMagnet.fixed ?? false
                      : false
                    : selectedParticle
                    ? selectedParticle.is_fixed()
                    : false
                }
                onChange={(e) =>
                  handlePropertyUpdate("fixed", e.target.checked)
                }
                className="w-4 h-4"
              />
              <span className="text-sm">Fixed</span>
            </label>
          </div>
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

        {/* Acceleration (read-only) */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            Acceleration:
          </label>
          <div className="flex gap-2">
            <div className="w-1/2 text-sm text-gray-700">
              X:{" "}
              {editingMagnet
                ? (selectedMagnet?.acc?.x ?? 0).toFixed(3)
                : (selectedParticle?.acc?.x ?? 0).toFixed(3)}
            </div>
            <div className="w-1/2 text-sm text-gray-700">
              Y:{" "}
              {editingMagnet
                ? (selectedMagnet?.acc?.y ?? 0).toFixed(3)
                : (selectedParticle?.acc?.y ?? 0).toFixed(3)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
