import { Link } from "react-router-dom";
import { Application, extend } from "@pixi/react";
import SandBox from "../components/SandBox";
import { useWindowDimension } from "../utils/useWindowDimension";
import Transitions from "../utils/Transitions";
import { Universe } from "physics-engine";
import { useEffect, useRef, memo } from "react";
import { Viewport } from "../utils/Viewport";
import {
  SimulationProvider,
  useSimulation,
} from "../contexts/SimulationContext";
import { Container } from "pixi.js";

extend({ Container });

// Memoize the canvas to prevent re-renders from context changes
const PixiCanvas = memo(function PixiCanvas({
  universe,
}: {
  universe: Universe;
}) {
  const [width, height] = useWindowDimension();

  return (
    <Application
      background={"#ffffff"}
      width={width}
      height={height}
      className="overflow-hidden fixed top-0 left-0"
      antialias
      onInit={(app) => {
        // Store app reference globally for viewport access
        (window as any).pixiApp = app;
      }}
    >
      <Viewport>
        <SandBox universe={universe} />
      </Viewport>
    </Application>
  );
});

function HomeContent({ universe }: { universe: Universe }) {
  const {
    setShowEquipotentialLines,
    setShowFieldLines,
    showEquipotentialLines,
    showFieldLines,
  } = useSimulation();
  useEffect(() => {
    setShowEquipotentialLines(true);
    setShowFieldLines(true);
  }, [showEquipotentialLines, showFieldLines]);
  return (
    <Transitions>
      <PixiCanvas universe={universe} />
      <div className="fixed -translate-x-1/2 -translate-y-1/3 left-1/2 top-1/3 z-10">
        <h1 className="text-4xl md:text-6xl font-semibold mb-8 text-gray-900">
          Electromagnetism
        </h1>
        <div className="flex flex-col gap-3 mx-auto justify-center">
          <Link
            to="/simulation"
            className="no-underline w-1/2 mx-auto bg-black text-white text-xl lg:text-3xl font-bold px-8 py-3 rounded-lg shadow-lg text-center transition-transform hover:scale-105"
          >
            Simulation
          </Link>
        </div>
      </div>
    </Transitions>
  );
}

export default function Home() {
  const [width, height] = useWindowDimension();
  const universeRef = useRef<Universe>(Universe.new_empty());

  useEffect(() => {
    // Initialize universe
    const universe = universeRef.current;
    // Use physical Coulomb constant by default
    universe.set_coulomb_constant(8.9875517923e3);
    universe.set_default_charge(1.0);

    // Add random particles in a loop
    const addRandomParticles = () => {
      const count = universe.get_particles().length;
      if (count < 10) {
        for (let i = 0; i < 1; i++) {
          const x = Math.random() * width - width / 2;
          const y = Math.random() * 200;
          universe.add_particle_simple(x, y, 0.0, 0.0, Math.random() * 40 - 20);
        }
      }
    };

    addRandomParticles();
    const interval = setInterval(addRandomParticles, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [width, height]);

  return (
    <SimulationProvider universe={universeRef.current}>
      <HomeContent universe={universeRef.current} />
    </SimulationProvider>
  );
}
