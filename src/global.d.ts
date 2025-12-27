import type { PixiElements } from "@pixi/react";
import { type PixiReactElementProps } from "@pixi/react";
import { type Application } from "pixi.js";
import { PropsWithChildren } from "react";

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends PixiElements {
        pixiViewportWrapper: PropsWithChildren<PixiReactElementProps<any>> & {
          app: Application;
        };
      }
    }
  }
}

export {};
