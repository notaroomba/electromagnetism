import { useState, useRef } from "react";
import { useSimulation } from "../contexts/SimulationContext";
import { Atom, CircleDashed } from "lucide-react";

export default function SideBar() {
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
  const [changeCount, setChangeCount] = useState(1);
  const addIntervalRef = useRef<number | null>(null);
  const removeIntervalRef = useRef<number | null>(null);

  const addParticles = (count: number) => {
    for (let i = 0; i < count; i++) {
      // Add particles with random velocities and positions
      universe.add_particle_simple(
        Math.random() * 200 - 100,
        Math.random() * 200 - 100,
        Math.random() * 50 - 25,
        Math.random() * 50 - 25,
        Math.random() * 50 - 25
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
    addParticles(changeCount);
    addIntervalRef.current = setInterval(() => {
      addParticles(changeCount);
    }, 200);
  };

  const handleAddMouseUp = () => {
    if (addIntervalRef.current) {
      clearInterval(addIntervalRef.current);
      addIntervalRef.current = null;
    }
  };

  const handleRemoveMouseDown = () => {
    removeParticles(changeCount);
    removeIntervalRef.current = setInterval(() => {
      removeParticles(changeCount);
    }, 200);
  };

  const handleRemoveMouseUp = () => {
    if (removeIntervalRef.current) {
      clearInterval(removeIntervalRef.current);
      removeIntervalRef.current = null;
    }
  };

  return (
    <div className="w-fit max-w-full py-2 px-2 sm:px-4 bg-white border pointer-events-auto border-gray-200 rounded-lg shadow-xl overflow-x-auto">
      <div className="flex flex-col items-center justify-center divide-x divide-gray-300 flex-wrap sm:flex-nowrap gap-y-2">
        <button
          onClick={() => {
            setIsPaused(true);
            addParticles(changeCount);
          }}
          className={`p-1.5 sm:p-2 rounded cursor-pointer transition-all duration-200 ${
            showEquipotentialLines ? "bg-blue-100" : "hover:bg-gray-100"
          }`}
          title={showEquipotentialLines ? "Add Particle" : "Add Particle"}
        >
          <Atom className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
}
