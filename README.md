# Electromagnetism

<p align="center">
  <a href="https://electromagnetism.notaroomba.dev"><img src="public/logo.png" alt="Electromagnetism" width="180"></a>
</p>

<p align="center">
  Interactive 2D electrostatic & magnetic particle simulation with a Rust physics engine compiled to WebAssembly.
</p>

<div align="center">

![Rust](https://img.shields.io/badge/rust-%23000000.svg?style=for-the-badge&logo=rust&logoColor=white)
![WASM](https://img.shields.io/badge/WebAssembly-%2300969C.svg?style=for-the-badge&logo=webassembly&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![PixiJS](https://img.shields.io/badge/Pixi.js-%23FF66CC.svg?style=for-the-badge)

</div>

An interactive sandbox for charged particles and magnets that combines a high-performance physics core (written in Rust and compiled to WebAssembly) with a responsive web UI (React + TypeScript) and PixiJS for high-performance 2D rendering.

Demo: (if you have a hosted demo link, replace the URL below)

<p align="center">
  <a href="#">Live demo</a>
</p>

## Key features

- Physics engine implemented in Rust and compiled to WebAssembly for accurate, real-time simulation
- Charged-particle Coulomb interactions and magnet dipole approximations
- Multiple integration methods (Euler, RK4, Verlet, Leapfrog)
- Quadtree (Barnes–Hut) optimization for efficient Coulomb force computation
- Interactive editor: add atoms or magnets, pause and drag objects to edit their properties
- Side bar to configure pre-add fields and randomize them
- Property editor for selected particles/magnets (mass, charge, magnet strength, rotation, velocity)
- Visual overlays: equipotential / field lines, velocity vectors, trails, FPS counter
- Magnet rendering with two-sided colors + N/S labels

## Preview

Open the app locally with `npm run dev` and try:
- Add charged particles and magnets from the side bar
- Toggle velocity vectors and equipotential views from the settings bar
- Pause, click-and-drag an object to edit it in the property editor

## Building

### Prerequisites
- Rust and wasm-pack
- Bun or Node.js

### Build the physics engine (WASM)

```powershell
bun run build:rust
# or
npm run build:rust
```

### Run the development server

```powershell
bun run dev
# or
npm run dev
```

### Build for production

```powershell
bun run build
# or
npm run build
```

## Notes & TODO

- Magnet physics are currently approximated using a dipole model (two pseudo-poles); more accurate magnetic interactions (Lorentz forces, torques) can be added later
- Improve TypeScript typings for generated wasm package (currently some calls use `as any`)
- More presets (e.g., dipole arrays, particle beams), and export/import of states

## Credits

- Rust + wasm-bindgen for the physics engine
- React + TypeScript for the UI, TailwindCSS for styling, PixiJS for rendering

## License

MIT

---

> [notaroomba.dev](https://notaroomba.dev) &nbsp;&middot;&nbsp;
> GitHub [@NotARoomba](https://github.com/NotARoomba)