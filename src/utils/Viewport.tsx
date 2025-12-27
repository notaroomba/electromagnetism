import { Viewport as BaseViewport, type IViewportOptions } from "pixi-viewport";
import { extend, useApplication } from "@pixi/react";
import { type PropsWithChildren } from "react";
import { Application } from "pixi.js";

type ViewportProps = Omit<IViewportOptions, "events">;

class ViewportWrapper extends BaseViewport {
  constructor(options: ViewportProps & { app: Application }) {
    const { app, ...rest } = options;
    super({
      ...rest,
      // events is the only required argument to the constructor.
      events: app.renderer.events,
    });
    //get url ane if its at root then disable drag and pan
    const url = new URL(window.location.href);
    if (url.pathname !== "/") {
      this.drag({ mouseButtons: "left" }).pinch().wheel().decelerate();
    }
  }
}

extend({ ViewportWrapper });

function Viewport(props: PropsWithChildren<ViewportProps>) {
  const { children, ...rest } = props;
  const { app } = useApplication();

  return (
    app?.renderer && (
      <pixiViewportWrapper
        position={{ x: app.canvas.width / 2, y: (app.canvas.height / 4) * 3 }}
        app={app}
        {...rest}
      >
        {children}
      </pixiViewportWrapper>
    )
  );
}

export { Viewport };
