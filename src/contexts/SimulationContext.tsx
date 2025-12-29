import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Universe } from "physics-engine";

interface SimulationContextType {
  universe: Universe;
  render: number;
  setRender: React.Dispatch<React.SetStateAction<number>>;
  selectedParticleIndex: number | null;
  setSelectedParticleIndex: (index: number | null) => void;
  selectedMagnetIndex: number | null;
  setSelectedMagnetIndex: (index: number | null) => void;
  isPropertyEditorOpen: boolean;
  setIsPropertyEditorOpen: (open: boolean) => void;
  isUniverseEditorOpen: boolean;
  setIsUniverseEditorOpen: (open: boolean) => void;
  showMoreInfo: boolean;
  setShowMoreInfo: (show: boolean) => void;
  showVelocityVectors: boolean;
  setShowVelocityVectors: (show: boolean) => void;
  showEquipotentialLines: boolean;
  setShowEquipotentialLines: (show: boolean) => void;
  showFieldLines: boolean;
  setShowFieldLines: (show: boolean) => void;
  viewQuadtree: boolean;
  setViewQuadtree: (view: boolean) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  fps: number;
  setFps: React.Dispatch<React.SetStateAction<number>>;
}

const SimulationContext = createContext<SimulationContextType | undefined>(
  undefined
);

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error("useSimulation must be used within SimulationProvider");
  }
  return context;
}

interface SimulationProviderProps {
  children: ReactNode;
  universe: Universe;
}

export function SimulationProvider({
  children,
  universe,
}: SimulationProviderProps) {
  const [render, setRender] = useState(0);
  const [selectedParticleIndex, setSelectedParticleIndex] = useState<
    number | null
  >(null);
  const [selectedMagnetIndex, setSelectedMagnetIndex] = useState<number | null>(
    null
  );
  const [isPropertyEditorOpen, setIsPropertyEditorOpen] = useState(false);
  const [isUniverseEditorOpen, setIsUniverseEditorOpen] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [showVelocityVectors, setShowVelocityVectors] = useState(false);
  const [showEquipotentialLines, setShowEquipotentialLines] = useState(false);
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [viewQuadtree, setViewQuadtree] = useState(false);
  const [isPaused, setIsPaused] = useState(universe.get_is_paused());
  const [fps, setFps] = useState(0);

  useEffect(() => {
    universe.set_is_paused(isPaused);

    setRender((prev) => prev + 1);
  }, [isPaused]);

  return (
    <SimulationContext.Provider
      value={{
        universe,
        render,
        setRender,
        selectedParticleIndex,
        setSelectedParticleIndex,
        selectedMagnetIndex,
        setSelectedMagnetIndex,
        isPropertyEditorOpen,
        setIsPropertyEditorOpen,
        isUniverseEditorOpen,
        setIsUniverseEditorOpen,
        showMoreInfo,
        setShowMoreInfo,
        showVelocityVectors,
        setShowVelocityVectors,
        showEquipotentialLines,
        setShowEquipotentialLines,
        showFieldLines,
        setShowFieldLines,
        viewQuadtree,
        setViewQuadtree,
        isPaused,
        setIsPaused,
        fps,
        setFps,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}
