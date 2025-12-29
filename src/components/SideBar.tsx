import { useState, useRef, useEffect } from "react";
import { useSimulation } from "../contexts/SimulationContext";
import { Atom, Magnet, Plus, Minus } from "lucide-react";

type AddType = "particle" | "magnet";

export default function SideBar() {
  const { universe, setRender } = useSimulation();
  const [addType, setAddType] = useState<AddType>("particle");
  const [addCount, setAddCount] = useState(1);
  const [addFixed, setAddFixed] = useState(false);
  const [addMass, setAddMass] = useState(universe.get_default_mass());
  const [addCharge, setAddCharge] = useState(universe.get_default_charge());
  const [addRadius, setAddRadius] = useState(10);
  const [addMagnetStrength, setAddMagnetStrength] = useState(20);
  const [addMagnetAngle, setAddMagnetAngle] = useState(0); // degrees
  const [addMagnetSize, setAddMagnetSize] = useState(60);
  const [addMagnetThickness, setAddMagnetThickness] = useState(20);
  const [addMagnetColorNorth, setAddMagnetColorNorth] = useState(0xff0000);
  const [addMagnetColorSouth, setAddMagnetColorSouth] = useState(0x0000ff);

  // Reuse refs for continuous add/remove
  const addIntervalRef = useRef<number | null>(null);
  const removeIntervalRef = useRef<number | null>(null);

  // When switching to magnet default it to fixed
  const switchAddType = (t: AddType) => {
    setAddType(t);
    if (t === "magnet") {
      setAddFixed(true);
    }
  };

  const addParticles = (count: number) => {
    for (let i = 0; i < count; i++) {
      // Add particles using explicit API to set mass/radius/charge
      const px =
        Math.random() * universe.get_spawn_range() -
        universe.get_spawn_range() / 2;
      const py =
        Math.random() * universe.get_spawn_range() -
        universe.get_spawn_range() / 2;
      const vx = Math.random() * 50 - 25;
      const vy = Math.random() * 50 - 25;
      // color 0 lets the engine choose based on charge sign
      universe.add_particle(px, py, vx, vy, addRadius, addMass, 0, addCharge);
      // Apply fixed property if requested
      if (addFixed) {
        (universe as any).update_particle_fixed(
          (universe.get_particle_count() as number) - 1,
          true
        );
      }
    }
    setRender((prev) => prev + 1);
  };

  const addMagnets = (count: number) => {
    for (let i = 0; i < count; i++) {
      const px =
        Math.random() * universe.get_spawn_range() -
        universe.get_spawn_range() / 2;
      const py =
        Math.random() * universe.get_spawn_range() -
        universe.get_spawn_range() / 2;
      // Use the wasm API added for magnets (full constructor)
      (universe as any).add_magnet(
        px,
        py,
        (addMagnetAngle * Math.PI) / 180.0,
        addMagnetSize,
        addMagnetThickness,
        addMass,
        addMagnetColorNorth,
        addMagnetColorSouth,
        addMagnetStrength,
        addFixed
      );
      // magnets are created fixed by default in the wasm helper
    }
    setRender((prev) => prev + 1);
  };

  const randomizeFields = () => {
    if (addType === "particle") {
      setAddMass(Math.random() * 4.9 + 0.1);
      setAddCharge((Math.random() - 0.5) * 100);
      setAddRadius(Math.random() * 18 + 2);
      setAddFixed(Math.random() > 0.5);
    } else {
      setAddMagnetAngle(Math.random() * 360);
      setAddMagnetStrength(
        (Math.random() * 45 + 5) * (Math.random() > 0.5 ? 1 : -1)
      );
      setAddMagnetSize(Math.random() * 90 + 30);
      setAddMagnetThickness(Math.random() * 35 + 5);
      setAddMass(Math.random() * 4.9 + 0.1);
      setAddMagnetColorNorth(Math.floor(Math.random() * 0xffffff));
      setAddMagnetColorSouth(Math.floor(Math.random() * 0xffffff));
      setAddFixed(Math.random() > 0.5);
    }
    setRender((prev) => prev + 1);
  };

  const handleAddMouseDown = () => {
    if (addType === "particle") {
      addParticles(addCount);
      addIntervalRef.current = setInterval(() => {
        addParticles(addCount);
      }, 200);
    } else {
      addMagnets(addCount);
      addIntervalRef.current = setInterval(() => {
        addMagnets(addCount);
      }, 200);
    }
  };

  const handleAddMouseUp = () => {
    if (addIntervalRef.current) {
      clearInterval(addIntervalRef.current);
      addIntervalRef.current = null;
    }
  };

  const handleRemoveMouseDown = () => {
    if (addType === "particle") {
      for (let i = 0; i < addCount; i++) universe.pop_particle();
    } else {
      for (let i = 0; i < addCount; i++) (universe as any).pop_magnet();
    }
    setRender((prev) => prev + 1);
    removeIntervalRef.current = setInterval(() => {
      if (addType === "particle") {
        for (let i = 0; i < addCount; i++) universe.pop_particle();
      } else {
        for (let i = 0; i < addCount; i++) (universe as any).pop_magnet();
      }
      setRender((prev) => prev + 1);
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
    <div className="w-fit max-w-full py-2 px-2 sm:px-4 bg-white border pointer-events-auto border-gray-200 rounded-lg shadow-xl overflow-x-auto">
      <div className="flex flex-col items-center justify-center divide-y divide-gray-300 gap-y-2">
        {/* Type selection */}
        <div className="flex items-center gap-2 py-2">
          <button
            onClick={() => switchAddType("particle")}
            className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 ${
              addType === "particle" ? "bg-blue-100" : "hover:bg-gray-100"
            }`}
            title="Add Atom"
          >
            <Atom className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={() => switchAddType("magnet")}
            className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 ${
              addType === "magnet" ? "bg-blue-100" : "hover:bg-gray-100"
            }`}
            title="Add Magnet"
          >
            <Magnet className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-2 py-2 px-1">
          <div className="flex items-center gap-2">
            <button
              onMouseDown={handleAddMouseDown}
              onMouseUp={handleAddMouseUp}
              onMouseLeave={handleAddMouseUp}
              className="p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 active:bg-blue-200 hover:bg-gray-100"
              title={`Add ${addCount} item(s) (Hold to add continuously)`}
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={randomizeFields}
              className="p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 hover:bg-gray-100"
              title="Randomize pre-add fields"
            >
              Randomize
            </button>

            <input
              type="number"
              value={addCount}
              onChange={(e) =>
                setAddCount(Math.max(1, parseInt(e.target.value) || 1))
              }
              min={1}
              max={100}
              className="w-12 px-1 py-0.5 text-xs sm:text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Number of items to add/remove"
            />

            <button
              onMouseDown={handleRemoveMouseDown}
              onMouseUp={handleRemoveMouseUp}
              onMouseLeave={handleRemoveMouseUp}
              className="p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 active:bg-blue-200 hover:bg-gray-100"
              title={`Remove ${addCount} item(s) (Hold to remove continuously)`}
            >
              <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex flex-col gap-2 w-full px-1">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={addFixed}
                onChange={(e) => setAddFixed(e.target.checked)}
              />
              <span className="text-sm">Fixed</span>
            </label>

            <label className="text-xs">Mass</label>
            <input
              type="number"
              value={addMass}
              onChange={(e) => setAddMass(parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border rounded"
            />

            <label className="text-xs">Charge</label>
            <input
              type="number"
              value={addCharge}
              onChange={(e) => setAddCharge(parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border rounded"
            />

            <label className="text-xs">Radius</label>
            <input
              type="number"
              value={addRadius}
              onChange={(e) => setAddRadius(parseFloat(e.target.value) || 1)}
              className="w-full px-2 py-1 text-sm border rounded"
            />

            {addType === "magnet" && (
              <>
                <label className="text-xs">Magnet Strength</label>
                <input
                  type="number"
                  value={addMagnetStrength}
                  onChange={(e) =>
                    setAddMagnetStrength(parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-2 py-1 text-sm border rounded"
                />
                <label className="text-xs">Angle (deg)</label>
                <input
                  type="number"
                  value={addMagnetAngle}
                  onChange={(e) =>
                    setAddMagnetAngle(parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-2 py-1 text-sm border rounded"
                />
                <label className="text-xs">Size</label>
                <input
                  type="number"
                  value={addMagnetSize}
                  onChange={(e) =>
                    setAddMagnetSize(parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-2 py-1 text-sm border rounded"
                />
                <label className="text-xs">Thickness</label>
                <input
                  type="number"
                  value={addMagnetThickness}
                  onChange={(e) =>
                    setAddMagnetThickness(parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-2 py-1 text-sm border rounded"
                />
                <label className="text-xs">North Color (hex)</label>
                <input
                  type="text"
                  value={addMagnetColorNorth.toString(16)}
                  onChange={(e) =>
                    setAddMagnetColorNorth(
                      parseInt(e.target.value, 16) || 0xff0000
                    )
                  }
                  className="w-full px-2 py-1 text-sm border rounded"
                />
                <label className="text-xs">South Color (hex)</label>
                <input
                  type="text"
                  value={addMagnetColorSouth.toString(16)}
                  onChange={(e) =>
                    setAddMagnetColorSouth(
                      parseInt(e.target.value, 16) || 0x0000ff
                    )
                  }
                  className="w-full px-2 py-1 text-sm border rounded"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
