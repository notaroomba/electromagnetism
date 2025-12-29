import { Universe } from "physics-engine";
import Transitions from "../utils/Transitions";
import { Application, extend } from "@pixi/react";
import { useWindowDimension } from "../utils/useWindowDimension";
import { Viewport } from "../utils/Viewport";
import SandBox from "../components/SandBox";
import { Container } from "pixi.js";
import SettingsBar from "../components/SettingsBar";
import PropertyEditor from "../components/PropertyEditor";
import UniversePropertyEditor from "../components/UniversePropertyEditor";
import { memo, useEffect } from "react";
import {
  SimulationProvider,
  useSimulation,
} from "../contexts/SimulationContext";
import SideBar from "../components/SideBar";

extend({ Container });

// Create universe singleton
const universeInstance: Universe = new Universe();

console.log("Universe initialized:", universeInstance.get_particles());

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
      className="overflow-hidden"
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

function SimulationContent() {
  const { universe, showMoreInfo, fps } = useSimulation();

  return (
    <Transitions>
      <PixiCanvas universe={universe} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 p-2 sm:p-4 pointer-events-none flex flex-col justify-center items-start">
        <p className="text-neutral-700 font-bold text-4xl md:text-5xl  text-center">
          Electromagnetism
        </p>
        <p className="text-neutral-700 text-md md:text-lg  text-center mx-auto">
          Made by{" "}
          <a
            className="underline pointer-events-auto"
            href="https://github.com/NotARoomba"
            target="_blank"
            rel="noopener noreferrer"
          >
            NotARoomba
          </a>
        </p>
      </div>

      {/* Info Overlay */}
      {showMoreInfo && (
        <div className="absolute top-4 right-4 bg-black/70 text-white p-4 rounded-lg text-sm font-mono space-y-1 pointer-events-none">
          <div>FPS: {fps}</div>
          <div>Particles: {universe.get_particle_count()}</div>
        </div>
      )}

      <div className="absolute bottom-0 w-screen p-2 sm:p-4 pointer-events-none flex justify-center items-start">
        <SettingsBar />
      </div>
      <div className="absolute left-0 top-0 h-screen p-2 sm:p-4 pointer-events-none flex justify-center items-center">
        <SideBar />
      </div>
      {/* Property Editors */}
      <PropertyEditor />
      <UniversePropertyEditor />
    </Transitions>
  );
}

export default function Simulation() {
  return (
    <SimulationProvider universe={universeInstance}>
      <SimulationContent />
    </SimulationProvider>
  );
}
