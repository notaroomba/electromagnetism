use rand::Rng;
use wasm_bindgen::prelude::*;
use serde::{ Serialize, Deserialize };
use core::ops;
use std::vec;

// Vec2 for 2D particle motion (y-axis is up)
#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone, PartialEq, Copy, Default)]
pub struct Vec2 {
    pub x: f64,
    pub y: f64,
}
#[wasm_bindgen]
impl Vec2 {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }
    pub fn distance_from(&self, other: Vec2) -> f64 {
        f64::sqrt(f64::powi(self.x - other.x, 2) + f64::powi(self.y - other.y, 2))
    }
    pub fn magnitude(&self) -> f64 {
        f64::sqrt(self.x * self.x + self.y * self.y)
    }
    pub fn normalize(&self) -> Vec2 {
        let mag = self.magnitude();
        if mag > 0.0 {
            Vec2::new(self.x / mag, self.y / mag)
        } else {
            Vec2::new(0.0, 0.0)
        }
    }
}
impl ops::Add for Vec2 {
    type Output = Vec2;
    fn add(self, rhs: Self) -> Self::Output {
        Vec2 {
            x: self.x + rhs.x,
            y: self.y + rhs.y,
        }
    }
}
impl ops::Sub for Vec2 {
    type Output = Vec2;
    fn sub(self, rhs: Self) -> Self::Output {
        Vec2 {
            x: self.x - rhs.x,
            y: self.y - rhs.y,
        }
    }
}
impl ops::AddAssign for Vec2 {
    fn add_assign(&mut self, other: Self) {
        *self = Self {
            x: self.x + other.x,
            y: self.y + other.y,
        };
    }
}
impl ops::DivAssign<f64> for Vec2 {
    fn div_assign(&mut self, d: f64) {
        self.x /= d;
        self.y /= d;
    }
}
impl ops::Mul<f64> for Vec2 {
    type Output = Self;
    fn mul(self, m: f64) -> Self {
        Self::new(self.x * m, self.y * m)
    }
}
impl ops::Div<f64> for Vec2 {
    type Output = Self;
    fn div(self, m: f64) -> Self {
        Self::new(self.x / m, self.y / m)
    }
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, PartialEq, Clone)]
pub struct Trail {
    pub pos: Vec2,
    pub color: u32,
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, PartialEq, Clone)]
pub struct Particle {
    pub pos: Vec2,
    pub vel: Vec2,
    pub acc: Vec2,
    trail: Vec<Trail>,
    pub radius: f32,
    pub mass: f64,
    pub color: u32,
    // Charge in Coulombs
    pub charge: f64,
    pub fixed: bool,
}
#[wasm_bindgen]
impl Particle {
    #[wasm_bindgen(constructor)]
    pub fn new(
        px: f64,
        py: f64,
        radius: f32,
        mass: f64,
        color: u32,
        vx: f64,
        vy: f64,
        charge: f64 // previously drag_coefficient
    ) -> Particle {
        Particle {
            pos: Vec2::new(px, py),
            vel: Vec2::new(vx, vy),
            acc: Vec2::new(0.0, 0.0),
            radius,
            mass,
            color,
            charge,
            trail: vec![],
            fixed: false,
        }
    }

    pub fn new_simple(px: f64, py: f64, radius: f32, mass: f64, color: u32) -> Particle {
        Particle {
            pos: Vec2::new(px, py),
            vel: Vec2::new(0.0, 0.0),
            acc: Vec2::new(0.0, 0.0),
            radius,
            mass,
            color,
            charge: 0.0, // default charge set by Universe when added simply
            trail: vec![],
            fixed: false,
        }
    }

    pub fn get_charge(&self) -> f64 {
        self.charge
    }
    pub fn set_charge(&mut self, charge: f64) {
        self.charge = charge;
    }

    pub fn get_trail(&self) -> Vec<Trail> {
        self.trail.clone()
    }

    pub fn add_trail_point(&mut self, pos: Vec2, color: u32, max: usize) {
        self.trail.push(Trail { pos, color });
        if self.trail.len() > max {
            self.trail.remove(0);
        }
    }

    pub fn get_data(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self).unwrap()
    }

    pub fn is_fixed(&self) -> bool {
        self.fixed
    }
    pub fn set_fixed(&mut self, f: bool) {
        self.fixed = f;
    }
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq)]
pub enum Implementation {
    Euler,
    RK4,
    Verlet,
    Leapfrog,
}

// Quadtree node used for Barnes-Hut approximation of Coulomb forces
#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone, Default)]
pub struct QuadTreeNode {
    charge: f64,
    center_of_charge: Vec2,
    dimensions: Vec2,
    center: Vec2,
    children: Option<[Box<QuadTreeNode>; 4]>,
    particles: Vec<Particle>,
}

#[wasm_bindgen]
impl QuadTreeNode {
    fn new(dimensions: Vec2, center: Vec2) -> QuadTreeNode {
        QuadTreeNode {
            charge: 0.0,
            center_of_charge: Vec2::new(0.0, 0.0),
            dimensions,
            center,
            children: None,
            particles: Vec::with_capacity(2),
        }
    }

    fn add_particle(&mut self, particle: &Particle) {
        if self.children.is_none() {
            self.particles.push(particle.clone());
            if self.particles.len() > 1 {
                self.subdivide();
            }
        } else {
            let quadrant: usize = self.get_quadrant(&Vec2::new(particle.pos.x, particle.pos.y));
            if let Some(children) = &mut self.children {
                children[quadrant].add_particle(particle);
            }
        }
    }

    fn subdivide(&mut self) {
        // no particles -> nothing to subdivide
        if self.particles.is_empty() {
            return;
        }
        let new_dimensions: Vec2 = Vec2::new(self.dimensions.x / 2.0, self.dimensions.y / 2.0);
        let child_centers: [Vec2; 4] = [
            self.center + Vec2::new(new_dimensions.x / 2.0, new_dimensions.y / 2.0),
            self.center + Vec2::new(-new_dimensions.x / 2.0, new_dimensions.y / 2.0),
            self.center + Vec2::new(-new_dimensions.x / 2.0, -new_dimensions.y / 2.0),
            self.center + Vec2::new(new_dimensions.x / 2.0, -new_dimensions.y / 2.0),
        ];
        let mut children: [Box<QuadTreeNode>; 4] = Default::default();
        for i in 0..4 {
            children[i] = Box::new(QuadTreeNode::new(new_dimensions, child_centers[i]));
        }
        for particle in &self.particles {
            let quadrant: usize = self.get_quadrant(&Vec2::new(particle.pos.x, particle.pos.y));
            children[quadrant].add_particle(particle);
        }
        self.children = Some(children);
        self.particles.clear();
    }

    fn get_quadrant(&self, position: &Vec2) -> usize {
        if position.x >= self.center.x && position.y >= self.center.y {
            0
        } else if position.x <= self.center.x && position.y >= self.center.y {
            1
        } else if position.x <= self.center.x && position.y <= self.center.y {
            2
        } else {
            3
        }
    }

    fn update_center_of_charge(&mut self) {
        if self.particles.len() == 1 {
            self.charge = self.particles[0].charge;
            self.center_of_charge = Vec2::new(self.particles[0].pos.x, self.particles[0].pos.y);
        } else if let Some(children) = &mut self.children {
            self.charge = 0.0;
            self.center_of_charge = Vec2::new(0.0, 0.0);
            for child in children.iter_mut() {
                child.update_center_of_charge();
                self.charge += child.charge;
                self.center_of_charge += child.center_of_charge * child.charge;
            }
            if self.charge != 0.0 {
                self.center_of_charge /= self.charge;
            } else {
                self.center_of_charge = self.center;
            }
        } else {
            self.charge = 0.0;
            self.center_of_charge = Vec2::new(0.0, 0.0);
        }
    }

    fn rebuild(&mut self, particles: &Vec<Particle>, dimensions: Vec2, center: Vec2) {
        *self = QuadTreeNode::new(dimensions, center);
        for particle in particles {
            self.add_particle(particle);
        }
        self.update_center_of_charge();
    }

    pub fn get_data(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self).unwrap()
    }
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone)]
pub struct Universe {
    particles: Vec<Particle>,
    magnets: Vec<Magnet>,
    // Coulomb constant (k = 8.9875517923e9 N·m^2/C^2)
    coulomb_constant: f64,
    air_density: f64, // repurposed: default charge
    show_trails: bool,
    is_paused: bool,
    implementation: Implementation,
    speed: f64,
    default_mass: f64,
    // Whether to use individual particle mass in acceleration calculations
    mass_calculation: bool,
    default_charge: f64, // renamed from default_drag_coefficient
    spawn_range: f64, // configurable spawn range for new particles (±units)
    wind_x: f64,
    wind_y: f64,
    // Minimum interaction distance to avoid Coulomb singularities
    min_interaction_distance: f64,
    // quadtree options
    use_quadtree: bool,
    quadtree_theta: f64,
    quadtree: QuadTreeNode,
    quadtree_threshold: usize,
    // collisions
    collisions_enabled: bool,
    restitution: f64, // coefficient of restitution (0..1)
}

#[wasm_bindgen]
impl Universe {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Universe {
        Universe::new_with_defaults(true)
    }

    pub fn new_empty() -> Universe {
        Universe::new_with_defaults(false)
    }

    fn new_with_defaults(with_defaults: bool) -> Universe {
        let particles = if with_defaults {
            // sample charge setup: positive/negative pair and a third neutral-ish
            let p1 = Particle::new(-200.0, 0.0, 10.0, 1.0, 0xff0000, 0.0, 0.0, 20.0); // positive
            let p2 = Particle::new(200.0, 0.0, 10.0, 1.0, 0xff0000, 0.0, 0.0, 20.0); // positive
            let p3 = Particle::new(0.0, 200.0, 10.0, 0.8, 0x0000ff, 0.0, 0.0, -20.0); // negative
            let p4 = Particle::new(0.0, -200.0, 10.0, 0.8, 0x0000ff, 0.0, 0.0, -20.0); // negative
            vec![p1, p2, p3, p4]
        } else {
            vec![]
        };

        Universe {
            particles,
            magnets: vec![],
            coulomb_constant: 8.9875517923e3, // Coulomb constant (N·m²/C²)
            air_density: 1.0, // default charge
            wind_x: 0.0,
            wind_y: 0.0,
            implementation: Implementation::Euler,
            speed: 1.0,
            show_trails: true,
            is_paused: false,
            default_mass: 1.0,
            mass_calculation: true,
            default_charge: 1.0, // default charge when adding simple
            spawn_range: 200.0, // default spawn spread in simulation units
            min_interaction_distance: 10.0, // default minimum distance (simulation units)
            use_quadtree: false,
            quadtree_theta: 0.5,
            quadtree: QuadTreeNode::new(Vec2::new(2000.0, 2000.0), Vec2::new(0.0, 0.0)),
            quadtree_threshold: 150,
            collisions_enabled: false,
            restitution: 1.0,
        }
    }

    pub fn time_step(&mut self, dt: f64) -> u8 {
        if self.particles.is_empty() || self.is_paused {
            return 1;
        }

        let speed_multiplier = self.speed * 2.0;
        let steps = (speed_multiplier.abs() * 50.0).ceil().max(1.0) as usize;
        let sub_dt = (dt * speed_multiplier) / (steps as f64);

        for _ in 0..steps {
            let result = self.single_physics_step(sub_dt);
            if result != 0 {
                return result;
            }
        }

        if self.show_trails {
            for p in &mut self.particles {
                p.add_trail_point(p.pos, p.color, 250);
            }
        }

        return 0;
    }

    fn single_physics_step(&mut self, dt: f64) -> u8 {
        match self.implementation {
            Implementation::Euler => {
                let accelerations = if self.use_quadtree {
                    self.calculate_electrostatic_accelerations_quadtree()
                } else {
                    self.calculate_electrostatic_accelerations()
                };

                if accelerations.iter().any(|acc| (acc.x.is_nan() || acc.y.is_nan())) {
                    return 1;
                }

                for i in 0..self.particles.len() {
                    if !self.particles[i].fixed {
                        self.particles[i].vel.x += accelerations[i].x * dt;
                        self.particles[i].vel.y += accelerations[i].y * dt;
                        self.particles[i].pos.x += self.particles[i].vel.x * dt;
                        self.particles[i].pos.y += self.particles[i].vel.y * dt;
                    }
                    self.particles[i].acc = accelerations[i];
                }

                // Update magnets (simple explicit integration per substep)
                let magnet_accs = self.calculate_magnet_accelerations();
                if magnet_accs.iter().any(|a| (a.x.is_nan() || a.y.is_nan())) {
                    return 1;
                }
                for mi in 0..self.magnets.len() {
                    if !self.magnets[mi].fixed {
                        self.magnets[mi].vel.x += magnet_accs[mi].x * dt;
                        self.magnets[mi].vel.y += magnet_accs[mi].y * dt;
                        self.magnets[mi].pos.x += self.magnets[mi].vel.x * dt;
                        self.magnets[mi].pos.y += self.magnets[mi].vel.y * dt;
                    }
                    self.magnets[mi].acc = magnet_accs[mi];
                }

                if self.collisions_enabled {
                    self.handle_collisions();
                }
            }
            Implementation::RK4 => {
                // 2D RK4 implementation
                let initial_positions: Vec<Vec2> = self.particles
                    .iter()
                    .map(|p| p.pos)
                    .collect();
                let initial_velocities: Vec<Vec2> = self.particles
                    .iter()
                    .map(|p| p.vel)
                    .collect();

                let k1_acc = self.calculate_electrostatic_accelerations_for_state(
                    &initial_positions,
                    &initial_velocities
                );
                let k1_vel = initial_velocities.clone();

                let mut k2_positions = Vec::with_capacity(self.particles.len());
                let mut k2_velocities = Vec::with_capacity(self.particles.len());
                for i in 0..self.particles.len() {
                    k2_positions.push(initial_positions[i] + k1_vel[i] * (dt * 0.5));
                    k2_velocities.push(initial_velocities[i] + k1_acc[i] * (dt * 0.5));
                }
                let k2_acc = self.calculate_electrostatic_accelerations_for_state(
                    &k2_positions,
                    &k2_velocities
                );

                let mut k3_positions = Vec::with_capacity(self.particles.len());
                let mut k3_velocities = Vec::with_capacity(self.particles.len());
                for i in 0..self.particles.len() {
                    k3_positions.push(initial_positions[i] + k2_velocities[i] * (dt * 0.5));
                    k3_velocities.push(initial_velocities[i] + k2_acc[i] * (dt * 0.5));
                }
                let k3_acc = self.calculate_electrostatic_accelerations_for_state(
                    &k3_positions,
                    &k3_velocities
                );

                let mut k4_positions = Vec::with_capacity(self.particles.len());
                let mut k4_velocities = Vec::with_capacity(self.particles.len());
                for i in 0..self.particles.len() {
                    k4_positions.push(initial_positions[i] + k3_velocities[i] * dt);
                    k4_velocities.push(initial_velocities[i] + k3_acc[i] * dt);
                }
                let k4_acc = self.calculate_electrostatic_accelerations_for_state(
                    &k4_positions,
                    &k4_velocities
                );

                // NaN check
                if
                    k1_acc.iter().any(|a| (a.x.is_nan() || a.y.is_nan())) ||
                    k2_acc.iter().any(|a| (a.x.is_nan() || a.y.is_nan())) ||
                    k3_acc.iter().any(|a| (a.x.is_nan() || a.y.is_nan())) ||
                    k4_acc.iter().any(|a| (a.x.is_nan() || a.y.is_nan()))
                {
                    return 1;
                }

                for i in 0..self.particles.len() {
                    self.particles[i].pos.x +=
                        ((k1_vel[i].x +
                            2.0 * k2_velocities[i].x +
                            2.0 * k3_velocities[i].x +
                            k4_velocities[i].x) *
                            dt) /
                        6.0;
                    self.particles[i].pos.y +=
                        ((k1_vel[i].y +
                            2.0 * k2_velocities[i].y +
                            2.0 * k3_velocities[i].y +
                            k4_velocities[i].y) *
                            dt) /
                        6.0;

                    if !self.particles[i].fixed {
                        self.particles[i].vel.x +=
                            ((k1_acc[i].x + 2.0 * k2_acc[i].x + 2.0 * k3_acc[i].x + k4_acc[i].x) *
                                dt) /
                            6.0;
                        self.particles[i].vel.y +=
                            ((k1_acc[i].y + 2.0 * k2_acc[i].y + 2.0 * k3_acc[i].y + k4_acc[i].y) *
                                dt) /
                            6.0;
                    }

                    self.particles[i].acc = k1_acc[i];
                }

                // Integrate magnets (after RK4 particles update)
                let magnet_accs = self.calculate_magnet_accelerations();
                if magnet_accs.iter().any(|a| (a.x.is_nan() || a.y.is_nan())) {
                    return 1;
                }
                for mi in 0..self.magnets.len() {
                    if !self.magnets[mi].fixed {
                        self.magnets[mi].vel.x += magnet_accs[mi].x * dt;
                        self.magnets[mi].vel.y += magnet_accs[mi].y * dt;
                        self.magnets[mi].pos.x += self.magnets[mi].vel.x * dt;
                        self.magnets[mi].pos.y += self.magnets[mi].vel.y * dt;
                    }
                    self.magnets[mi].acc = magnet_accs[mi];
                }

                if self.collisions_enabled {
                    self.handle_collisions();
                }
            }
            Implementation::Verlet => {
                let accelerations = self.calculate_electrostatic_accelerations();
                if accelerations.iter().any(|a| (a.x.is_nan() || a.y.is_nan())) {
                    return 1;
                }

                let mut new_positions = Vec::with_capacity(self.particles.len());
                for i in 0..self.particles.len() {
                    new_positions.push(
                        Vec2::new(
                            self.particles[i].pos.x +
                                self.particles[i].vel.x * dt +
                                0.5 * accelerations[i].x * dt * dt,
                            self.particles[i].pos.y +
                                self.particles[i].vel.y * dt +
                                0.5 * accelerations[i].y * dt * dt
                        )
                    );
                }

                let new_acc = self.calculate_electrostatic_accelerations_for_state(
                    &new_positions,
                    &self.particles
                        .iter()
                        .map(|p| p.vel)
                        .collect::<Vec<_>>()
                );
                if new_acc.iter().any(|a| (a.x.is_nan() || a.y.is_nan())) {
                    return 1;
                }

                for i in 0..self.particles.len() {
                    if !self.particles[i].fixed {
                        self.particles[i].vel.x += 0.5 * (accelerations[i].x + new_acc[i].x) * dt;
                        self.particles[i].vel.y += 0.5 * (accelerations[i].y + new_acc[i].y) * dt;
                        self.particles[i].pos = new_positions[i];
                    }
                    self.particles[i].acc = new_acc[i];
                }

                // Update magnets (Verlet integration: explicit update per substep)
                let magnet_accs = self.calculate_magnet_accelerations();
                if magnet_accs.iter().any(|a| (a.x.is_nan() || a.y.is_nan())) {
                    return 1;
                }
                for mi in 0..self.magnets.len() {
                    if !self.magnets[mi].fixed {
                        self.magnets[mi].vel.x += magnet_accs[mi].x * dt;
                        self.magnets[mi].vel.y += magnet_accs[mi].y * dt;
                        self.magnets[mi].pos.x += self.magnets[mi].vel.x * dt;
                        self.magnets[mi].pos.y += self.magnets[mi].vel.y * dt;
                    }
                    self.magnets[mi].acc = magnet_accs[mi];
                }

                if self.collisions_enabled {
                    self.handle_collisions();
                }
            }
            Implementation::Leapfrog => {
                let accelerations = self.calculate_electrostatic_accelerations();
                if accelerations.iter().any(|a| (a.x.is_nan() || a.y.is_nan())) {
                    return 1;
                }

                let mut velocities_half = Vec::with_capacity(self.particles.len());
                for i in 0..self.particles.len() {
                    velocities_half.push(
                        Vec2::new(
                            self.particles[i].vel.x + accelerations[i].x * (dt / 2.0),
                            self.particles[i].vel.y + accelerations[i].y * (dt / 2.0)
                        )
                    );
                }

                let mut new_positions = Vec::with_capacity(self.particles.len());
                for i in 0..self.particles.len() {
                    new_positions.push(
                        Vec2::new(
                            self.particles[i].pos.x + velocities_half[i].x * dt,
                            self.particles[i].pos.y + velocities_half[i].y * dt
                        )
                    );
                }

                let new_acc = self.calculate_electrostatic_accelerations_for_state(
                    &new_positions,
                    &velocities_half
                );
                if new_acc.iter().any(|a| (a.x.is_nan() || a.y.is_nan())) {
                    return 1;
                }

                for i in 0..self.particles.len() {
                    if !self.particles[i].fixed {
                        self.particles[i].pos = new_positions[i];
                        self.particles[i].vel.x = velocities_half[i].x + new_acc[i].x * (dt / 2.0);
                        self.particles[i].vel.y = velocities_half[i].y + new_acc[i].y * (dt / 2.0);
                    }
                    self.particles[i].acc = new_acc[i];
                }

                // Update magnets (Leapfrog - explicit per substep)
                let magnet_accs = self.calculate_magnet_accelerations();
                if magnet_accs.iter().any(|a| (a.x.is_nan() || a.y.is_nan())) {
                    return 1;
                }
                for mi in 0..self.magnets.len() {
                    if !self.magnets[mi].fixed {
                        self.magnets[mi].vel.x += magnet_accs[mi].x * dt;
                        self.magnets[mi].vel.y += magnet_accs[mi].y * dt;
                        self.magnets[mi].pos.x += self.magnets[mi].vel.x * dt;
                        self.magnets[mi].pos.y += self.magnets[mi].vel.y * dt;
                    }
                    self.magnets[mi].acc = magnet_accs[mi];
                }

                if self.collisions_enabled {
                    self.handle_collisions();
                }
            }
        }

        0
    }

    // Naive O(n^2) Coulomb acceleration calculation (2D)
    fn calculate_electrostatic_accelerations(&self) -> Vec<Vec2> {
        let n = self.particles.len();
        let mut accelerations = vec![Vec2::new(0.0, 0.0); n];

        for i in 0..n {
            let qi = self.particles[i].charge; // charge
            let mi = if self.mass_calculation { self.particles[i].mass } else { self.default_mass };
            for j in 0..n {
                if i == j {
                    continue;
                }
                let qj = self.particles[j].charge;

                let rx = self.particles[i].pos.x - self.particles[j].pos.x; // r = r_i - r_j
                let ry = self.particles[i].pos.y - self.particles[j].pos.y;
                let dist_sq = rx * rx + ry * ry;
                // Softening: enforce a minimum interaction distance to avoid singularities
                let min_dist = self.min_interaction_distance; // use configured softening distance
                let min_dist_sq = min_dist * min_dist;
                let safe_dist_sq = if dist_sq < min_dist_sq { min_dist_sq } else { dist_sq };
                let dist = f64::sqrt(safe_dist_sq);

                if dist > 1e-8 {
                    // Coulomb: F = k * qi * qj / r^2 * r_hat (where r_hat points from j->i)
                    let force_magnitude = (self.coulomb_constant * qi * qj) / safe_dist_sq;
                    let acc_magnitude = force_magnitude / mi;
                    accelerations[i].x += acc_magnitude * (rx / dist);
                    accelerations[i].y += acc_magnitude * (ry / dist);
                }
            }

            // Magnet dipole contributions: treat each magnet as two poles (+/- strength/2)
            for m in &self.magnets {
                let half = (m.size as f64) * 0.5;
                let ux = f64::cos(m.angle);
                let uy = f64::sin(m.angle);
                let north = Vec2::new(m.pos.x + ux * half, m.pos.y + uy * half);
                let south = Vec2::new(m.pos.x - ux * half, m.pos.y - uy * half);
                let pole_n = m.strength * 0.5; // north pole pseudo-charge
                let pole_s = -m.strength * 0.5; // south pole pseudo-charge

                // north pole
                {
                    let rx = self.particles[i].pos.x - north.x;
                    let ry = self.particles[i].pos.y - north.y;
                    let dist_sq = rx * rx + ry * ry;
                    let min_dist = self.min_interaction_distance;
                    let min_dist_sq = min_dist * min_dist;
                    let safe_dist_sq = if dist_sq < min_dist_sq { min_dist_sq } else { dist_sq };
                    let dist = f64::sqrt(safe_dist_sq);
                    if dist > 1e-8 {
                        let force_magnitude = (self.coulomb_constant * qi * pole_n) / safe_dist_sq;
                        let acc_magnitude = force_magnitude / mi;
                        accelerations[i].x += acc_magnitude * (rx / dist);
                        accelerations[i].y += acc_magnitude * (ry / dist);
                    }
                }

                // south pole
                {
                    let rx = self.particles[i].pos.x - south.x;
                    let ry = self.particles[i].pos.y - south.y;
                    let dist_sq = rx * rx + ry * ry;
                    let min_dist = self.min_interaction_distance;
                    let min_dist_sq = min_dist * min_dist;
                    let safe_dist_sq = if dist_sq < min_dist_sq { min_dist_sq } else { dist_sq };
                    let dist = f64::sqrt(safe_dist_sq);
                    if dist > 1e-8 {
                        let force_magnitude = (self.coulomb_constant * qi * pole_s) / safe_dist_sq;
                        let acc_magnitude = force_magnitude / mi;
                        accelerations[i].x += acc_magnitude * (rx / dist);
                        accelerations[i].y += acc_magnitude * (ry / dist);
                    }
                }
            }
        }

        accelerations
    }

    fn calculate_electrostatic_accelerations_for_state(
        &self,
        positions: &[Vec2],
        _velocities: &[Vec2]
    ) -> Vec<Vec2> {
        let n = positions.len();
        let mut accelerations = vec![Vec2::new(0.0, 0.0); n];

        for i in 0..n {
            let qi = self.particles[i].charge;
            let mi = if self.mass_calculation { self.particles[i].mass } else { self.default_mass };
            for j in 0..n {
                if i == j {
                    continue;
                }
                let qj = self.particles[j].charge;
                let rx = positions[i].x - positions[j].x;
                let ry = positions[i].y - positions[j].y;
                let dist_sq = rx * rx + ry * ry;
                // Softening to avoid singularities in intermediate state calculations
                let min_dist = self.min_interaction_distance; // use configured softening distance
                let min_dist_sq = min_dist * min_dist;
                let safe_dist_sq = if dist_sq < min_dist_sq { min_dist_sq } else { dist_sq };
                let dist = f64::sqrt(safe_dist_sq);
                if dist > 1e-8 {
                    let force_magnitude = (self.coulomb_constant * qi * qj) / safe_dist_sq;
                    let acc_magnitude = force_magnitude / mi;
                    accelerations[i].x += acc_magnitude * (rx / dist);
                    accelerations[i].y += acc_magnitude * (ry / dist);
                }
            }

            // Include magnet dipole contributions using magnet positions from self
            for m in &self.magnets {
                let half = (m.size as f64) * 0.5;
                let ux = f64::cos(m.angle);
                let uy = f64::sin(m.angle);
                let north = Vec2::new(m.pos.x + ux * half, m.pos.y + uy * half);
                let south = Vec2::new(m.pos.x - ux * half, m.pos.y - uy * half);
                let pole_n = m.strength * 0.5;
                let pole_s = -m.strength * 0.5;

                // North pole contribution
                {
                    let rx = positions[i].x - north.x;
                    let ry = positions[i].y - north.y;
                    let dist_sq = rx * rx + ry * ry;
                    let min_dist = self.min_interaction_distance;
                    let min_dist_sq = min_dist * min_dist;
                    let safe_dist_sq = if dist_sq < min_dist_sq { min_dist_sq } else { dist_sq };
                    let dist = f64::sqrt(safe_dist_sq);
                    if dist > 1e-8 {
                        let force_magnitude = (self.coulomb_constant * qi * pole_n) / safe_dist_sq;
                        let acc_magnitude = force_magnitude / mi;
                        accelerations[i].x += acc_magnitude * (rx / dist);
                        accelerations[i].y += acc_magnitude * (ry / dist);
                    }
                }

                // South pole contribution
                {
                    let rx = positions[i].x - south.x;
                    let ry = positions[i].y - south.y;
                    let dist_sq = rx * rx + ry * ry;
                    let min_dist = self.min_interaction_distance;
                    let min_dist_sq = min_dist * min_dist;
                    let safe_dist_sq = if dist_sq < min_dist_sq { min_dist_sq } else { dist_sq };
                    let dist = f64::sqrt(safe_dist_sq);
                    if dist > 1e-8 {
                        let force_magnitude = (self.coulomb_constant * qi * pole_s) / safe_dist_sq;
                        let acc_magnitude = force_magnitude / mi;
                        accelerations[i].x += acc_magnitude * (rx / dist);
                        accelerations[i].y += acc_magnitude * (ry / dist);
                    }
                }
            }
        }

        accelerations
    }

    // Compute accelerations on magnets due to particles and other magnets (dipole approximation)
    fn calculate_magnet_accelerations(&self) -> Vec<Vec2> {
        let mcount = self.magnets.len();
        let mut accs = vec![Vec2::new(0.0, 0.0); mcount];
        if mcount == 0 {
            return accs;
        }

        // Precompute particle charges/positions
        for i in 0..mcount {
            let m = &self.magnets[i];
            let half = (m.size as f64) * 0.5;
            let ux = f64::cos(m.angle);
            let uy = f64::sin(m.angle);
            let north = Vec2::new(m.pos.x + ux * half, m.pos.y + uy * half);
            let south = Vec2::new(m.pos.x - ux * half, m.pos.y - uy * half);
            let pole_i_n = m.strength * 0.5;
            let pole_i_s = -m.strength * 0.5;

            // Contribution from particles
            for p in &self.particles {
                let qi = p.charge;
                // force on north pole due to particle
                let rxn = north.x - p.pos.x;
                let ryn = north.y - p.pos.y;
                let dist_sq_n = rxn * rxn + ryn * ryn;
                let min_dist = self.min_interaction_distance;
                let min_dist_sq = min_dist * min_dist;
                let safe_dist_sq_n = if dist_sq_n < min_dist_sq { min_dist_sq } else { dist_sq_n };
                let dist_n = f64::sqrt(safe_dist_sq_n);
                if dist_n > 1e-8 {
                    let force_mag_n = (self.coulomb_constant * qi * pole_i_n) / safe_dist_sq_n;
                    accs[i].x += (force_mag_n * (rxn / dist_n)) / m.mass;
                    accs[i].y += (force_mag_n * (ryn / dist_n)) / m.mass;
                }

                // force on south pole due to particle
                let rxs = south.x - p.pos.x;
                let rys = south.y - p.pos.y;
                let dist_sq_s = rxs * rxs + rys * rys;
                let safe_dist_sq_s = if dist_sq_s < min_dist_sq { min_dist_sq } else { dist_sq_s };
                let dist_s = f64::sqrt(safe_dist_sq_s);
                if dist_s > 1e-8 {
                    let force_mag_s = (self.coulomb_constant * qi * pole_i_s) / safe_dist_sq_s;
                    accs[i].x += (force_mag_s * (rxs / dist_s)) / m.mass;
                    accs[i].y += (force_mag_s * (rys / dist_s)) / m.mass;
                }
            }

            // Contribution from other magnets (pole-pole interactions)
            for j in 0..mcount {
                if i == j {
                    continue;
                }
                let other = &self.magnets[j];
                let half_o = (other.size as f64) * 0.5;
                let ux_o = f64::cos(other.angle);
                let uy_o = f64::sin(other.angle);
                let north_o = Vec2::new(other.pos.x + ux_o * half_o, other.pos.y + uy_o * half_o);
                let south_o = Vec2::new(other.pos.x - ux_o * half_o, other.pos.y - uy_o * half_o);
                let pole_j_n = other.strength * 0.5;
                let pole_j_s = -other.strength * 0.5;

                // i.north with j.north
                let rx = north.x - north_o.x;
                let ry = north.y - north_o.y;
                let dist_sq = rx * rx + ry * ry;
                let min_dist = self.min_interaction_distance;
                let min_dist_sq = min_dist * min_dist;
                let safe_dist_sq = if dist_sq < min_dist_sq { min_dist_sq } else { dist_sq };
                let dist = f64::sqrt(safe_dist_sq);
                if dist > 1e-8 {
                    let force_mag = (self.coulomb_constant * pole_i_n * pole_j_n) / safe_dist_sq;
                    accs[i].x += (force_mag * (rx / dist)) / m.mass;
                    accs[i].y += (force_mag * (ry / dist)) / m.mass;
                }

                // i.north with j.south
                let rx = north.x - south_o.x;
                let ry = north.y - south_o.y;
                let dist_sq = rx * rx + ry * ry;
                let safe_dist_sq = if dist_sq < min_dist_sq { min_dist_sq } else { dist_sq };
                let dist = f64::sqrt(safe_dist_sq);
                if dist > 1e-8 {
                    let force_mag = (self.coulomb_constant * pole_i_n * pole_j_s) / safe_dist_sq;
                    accs[i].x += (force_mag * (rx / dist)) / m.mass;
                    accs[i].y += (force_mag * (ry / dist)) / m.mass;
                }

                // i.south with j.north
                let rx = south.x - north_o.x;
                let ry = south.y - north_o.y;
                let dist_sq = rx * rx + ry * ry;
                let safe_dist_sq = if dist_sq < min_dist_sq { min_dist_sq } else { dist_sq };
                let dist = f64::sqrt(safe_dist_sq);
                if dist > 1e-8 {
                    let force_mag = (self.coulomb_constant * pole_i_s * pole_j_n) / safe_dist_sq;
                    accs[i].x += (force_mag * (rx / dist)) / m.mass;
                    accs[i].y += (force_mag * (ry / dist)) / m.mass;
                }

                // i.south with j.south
                let rx = south.x - south_o.x;
                let ry = south.y - south_o.y;
                let dist_sq = rx * rx + ry * ry;
                let safe_dist_sq = if dist_sq < min_dist_sq { min_dist_sq } else { dist_sq };
                let dist = f64::sqrt(safe_dist_sq);
                if dist > 1e-8 {
                    let force_mag = (self.coulomb_constant * pole_i_s * pole_j_s) / safe_dist_sq;
                    accs[i].x += (force_mag * (rx / dist)) / m.mass;
                    accs[i].y += (force_mag * (ry / dist)) / m.mass;
                }
            }
        }

        accs
    }

    // Collision handling (elastic collisions)
    fn handle_collisions(&mut self) {
        let n = self.particles.len();
        for i in 0..n {
            for j in i + 1..n {
                let dx = self.particles[i].pos.x - self.particles[j].pos.x;
                let dy = self.particles[i].pos.y - self.particles[j].pos.y;
                let dist = f64::sqrt(dx * dx + dy * dy);
                let min_dist = (self.particles[i].radius + self.particles[j].radius) as f64;

                if dist > 0.0 && dist < min_dist {
                    // Normal from j to i
                    let nx = dx / dist;
                    let ny = dy / dist;

                    // Relative velocity along normal
                    let rvx = self.particles[i].vel.x - self.particles[j].vel.x;
                    let rvy = self.particles[i].vel.y - self.particles[j].vel.y;
                    let rel_vel_along_normal = rvx * nx + rvy * ny;

                    if rel_vel_along_normal < 0.0 {
                        // compute impulse scalar
                        let inv_m1 = if self.particles[i].fixed {
                            0.0
                        } else {
                            1.0 / self.particles[i].mass
                        };
                        let inv_m2 = if self.particles[j].fixed {
                            0.0
                        } else {
                            1.0 / self.particles[j].mass
                        };
                        let impulse =
                            (-(1.0 + self.restitution) * rel_vel_along_normal) / (inv_m1 + inv_m2);

                        if !self.particles[i].fixed {
                            self.particles[i].vel.x += impulse * inv_m1 * nx;
                            self.particles[i].vel.y += impulse * inv_m1 * ny;
                        }
                        if !self.particles[j].fixed {
                            self.particles[j].vel.x -= impulse * inv_m2 * nx;
                            self.particles[j].vel.y -= impulse * inv_m2 * ny;
                        }
                    }

                    // Positional correction to prevent sinking
                    let penetration = min_dist - dist;
                    if !self.particles[i].fixed && !self.particles[j].fixed {
                        let correction = 0.5 * penetration;
                        self.particles[i].pos.x += nx * correction;
                        self.particles[i].pos.y += ny * correction;
                        self.particles[j].pos.x -= nx * correction;
                        self.particles[j].pos.y -= ny * correction;
                    } else if self.particles[i].fixed {
                        self.particles[j].pos.x -= nx * penetration;
                        self.particles[j].pos.y -= ny * penetration;
                    } else if self.particles[j].fixed {
                        self.particles[i].pos.x += nx * penetration;
                        self.particles[i].pos.y += ny * penetration;
                    }
                }
            }
        }
    }

    pub fn reset(&mut self) {
        *self = Universe::new();
    }

    // Magnet addition/removal and accessors
    pub fn add_magnet(
        &mut self,
        px: f64,
        py: f64,
        angle: f64,
        size: f32,
        thickness: f32,
        mass: f64,
        color_north: u32,
        color_south: u32,
        strength: f64,
        fixed: bool
    ) {
        let m = Magnet::new(
            px,
            py,
            angle,
            size,
            thickness,
            mass,
            color_north,
            color_south,
            strength,
            fixed
        );
        self.magnets.push(m);
    }

    pub fn add_magnet_simple(&mut self, px: f64, py: f64, strength: f64) {
        let m = Magnet::new_simple(px, py, strength);
        self.magnets.push(m);
    }

    // Magnet helpers (reintroduced)
    pub fn pop_magnet(&mut self) {
        self.magnets.pop();
    }

    pub fn remove_magnet(&mut self, index: usize) {
        if index < self.magnets.len() {
            self.magnets.remove(index);
        }
    }

    pub fn get_magnets(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.magnets).unwrap()
    }

    pub fn get_magnet(&self, index: usize) -> Option<Magnet> {
        self.magnets.get(index).cloned()
    }

    pub fn get_magnet_count(&self) -> i32 {
        self.magnets.len() as i32
    }

    pub fn update_magnet_position(&mut self, index: usize, x: f64, y: f64) {
        if index < self.magnets.len() {
            self.magnets[index].pos = Vec2::new(x, y);
        }
    }

    pub fn update_magnet_velocity(&mut self, index: usize, vx: f64, vy: f64) {
        if index < self.magnets.len() {
            self.magnets[index].vel = Vec2::new(vx, vy);
        }
    }

    pub fn update_magnet_mass(&mut self, index: usize, mass: f64) {
        if index < self.magnets.len() {
            self.magnets[index].mass = mass;
        }
    }

    pub fn update_magnet_color_north(&mut self, index: usize, color: u32) {
        if index < self.magnets.len() {
            self.magnets[index].color_north = color;
        }
    }

    pub fn update_magnet_color_south(&mut self, index: usize, color: u32) {
        if index < self.magnets.len() {
            self.magnets[index].color_south = color;
        }
    }

    pub fn update_magnet_size(&mut self, index: usize, size: f32) {
        if index < self.magnets.len() {
            self.magnets[index].size = size;
        }
    }

    pub fn update_magnet_thickness(&mut self, index: usize, thickness: f32) {
        if index < self.magnets.len() {
            self.magnets[index].thickness = thickness;
        }
    }

    pub fn update_magnet_strength(&mut self, index: usize, strength: f64) {
        if index < self.magnets.len() {
            self.magnets[index].strength = strength;
        }
    }

    pub fn update_magnet_fixed(&mut self, index: usize, fixed: bool) {
        if index < self.magnets.len() {
            self.magnets[index].fixed = fixed;
        }
    }

    pub fn update_magnet_angle(&mut self, index: usize, angle: f64) {
        if index < self.magnets.len() {
            self.magnets[index].angle = angle;
        }
    }

    // Particle addition/removal and accessors
    pub fn add_particle(
        &mut self,
        px: f64,
        py: f64,
        vx: f64,
        vy: f64,
        radius: f32,
        mass: f64,
        color: u32,
        charge: f64
    ) {
        let mut particle = Particle::new(px, py, radius, mass, color, vx, vy, charge);
        // If default charge was set in default_charge, use it when the provided charge is 0
        if particle.charge == 0.0 {
            particle.charge = self.default_charge;
        }

        // If caller didn't specify a color (0), pick color based on charge sign
        if color == 0 {
            particle.color = if particle.charge < 0.0 {
                0x0000ff
            } else if particle.charge > 0.0 {
                0xff0000
            } else {
                Self::random_color()
            };
        }

        self.particles.push(particle);
    }

    pub fn random_color() -> u32 {
        let colors = [0xff0000, 0x0000ff, 0x00ff00, 0xf0f000, 0x00f0f0, 0xf000f0];
        let idx = rand::thread_rng().gen_range(0..colors.len());
        colors[idx]
    }

    pub fn add_particle_simple(&mut self, px: f64, py: f64, vx: f64, vy: f64, c: f64) {
        // Color by charge sign: red = positive, blue = negative, random for neutral
        let default_color = if c < 0.0 {
            0x0000ff
        } else if c > 0.0 {
            0xff0000
        } else {
            Self::random_color()
        };
        let default_radius = 10.0;

        let p = Particle::new(px, py, default_radius, self.default_mass, default_color, vx, vy, c);
        self.particles.push(p);
    }

    pub fn pop_particle(&mut self) {
        self.particles.pop();
    }

    pub fn remove_particle(&mut self, index: usize) {
        if index < self.particles.len() {
            self.particles.remove(index);
        }
    }

    pub fn get_particles(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.particles).unwrap()
    }

    pub fn get_particle(&self, index: usize) -> Option<Particle> {
        self.particles.get(index).cloned()
    }

    pub fn get_particle_count(&self) -> i32 {
        self.particles.len() as i32
    }

    pub fn get_trails(&self) -> JsValue {
        if self.show_trails {
            let trails: Vec<Vec<Trail>> = self.particles
                .iter()
                .map(|p| p.get_trail())
                .collect();
            serde_wasm_bindgen::to_value(&trails).unwrap()
        } else {
            let trails: Vec<Vec<Trail>> = vec![];
            serde_wasm_bindgen::to_value(&trails).unwrap()
        }
    }

    pub fn get_data(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self).unwrap()
    }

    pub fn set_coulomb_constant(&mut self, k: f64) {
        self.coulomb_constant = k;
    }

    pub fn get_coulomb_constant(&self) -> f64 {
        return self.coulomb_constant;
    }
    pub fn set_speed(&mut self, speed: f64) {
        self.speed = speed;
    }

    pub fn get_speed(&self) -> f64 {
        return self.speed;
    }

    pub fn set_is_paused(&mut self, is_paused: bool) {
        self.is_paused = is_paused;
    }

    pub fn get_is_paused(&self) -> bool {
        return self.is_paused;
    }

    pub fn set_implementation(&mut self, implementation: Implementation) {
        self.implementation = implementation;
    }

    pub fn get_implementation(&self) -> Implementation {
        return self.implementation;
    }

    pub fn set_show_trails(&mut self, show_trails: bool) {
        self.show_trails = show_trails;
    }

    pub fn get_show_trails(&self) -> bool {
        return self.show_trails;
    }

    // New: minimum interaction distance (softening) to avoid singular Coulomb forces
    pub fn set_min_interaction_distance(&mut self, d: f64) {
        self.min_interaction_distance = d;
    }

    pub fn get_min_interaction_distance(&self) -> f64 {
        self.min_interaction_distance
    }

    pub fn set_spawn_range(&mut self, r: f64) {
        self.spawn_range = r;
    }

    pub fn get_spawn_range(&self) -> f64 {
        self.spawn_range
    }

    pub fn set_default_charge(&mut self, charge: f64) {
        self.default_charge = charge;
    }

    pub fn get_default_charge(&self) -> f64 {
        return self.default_charge;
    }

    pub fn set_default_mass(&mut self, mass: f64) {
        self.default_mass = mass;
    }

    pub fn get_default_mass(&self) -> f64 {
        return self.default_mass;
    }

    // Toggle whether individual particle mass is used in acceleration calculations
    pub fn set_mass_calculation(&mut self, mass_calculation: bool) {
        self.mass_calculation = mass_calculation;
    }

    pub fn get_mass_calculation(&self) -> bool {
        return self.mass_calculation;
    }

    // Quadtree controls (reintroduced)
    pub fn set_use_quadtree(&mut self, use_quadtree: bool) {
        self.use_quadtree = use_quadtree;
    }

    pub fn get_use_quadtree(&self) -> bool {
        return self.use_quadtree;
    }

    pub fn toggle_use_quadtree(&mut self) {
        self.use_quadtree = !self.use_quadtree;
    }

    pub fn set_quadtree_theta(&mut self, theta: f64) {
        self.quadtree_theta = theta;
    }

    pub fn get_quadtree_theta(&self) -> f64 {
        return self.quadtree_theta;
    }

    pub fn get_quadtree(&mut self) -> JsValue {
        if !self.particles.is_empty() {
            let mut min = Vec2::new(f64::MAX, f64::MAX);
            let mut max = Vec2::new(f64::MIN, f64::MIN);

            for p in &self.particles {
                if p.pos.x < min.x {
                    min.x = p.pos.x;
                }
                if p.pos.y < min.y {
                    min.y = p.pos.y;
                }
                if p.pos.x > max.x {
                    max.x = p.pos.x;
                }
                if p.pos.y > max.y {
                    max.y = p.pos.y;
                }
            }

            // Add small padding
            let padding = 100.0;
            min = min - Vec2::new(padding, padding);
            max = max + Vec2::new(padding, padding);
            let dimensions = max - min;
            let center = min + dimensions * 0.5;
            self.quadtree.rebuild(&self.particles, dimensions, center);
        }
        serde_wasm_bindgen::to_value(&self.quadtree).unwrap()
    }
    pub fn set_use_mass_in_calculation(&mut self, _use_mass: bool) {
        // Mass is always used for converting force->acceleration in this simulation
    }

    pub fn get_use_mass_in_calculation(&self) -> bool {
        return true;
    }

    // Collisions controls
    pub fn set_collisions_enabled(&mut self, enabled: bool) {
        self.collisions_enabled = enabled;
    }

    pub fn get_collisions_enabled(&self) -> bool {
        return self.collisions_enabled;
    }

    pub fn set_restitution(&mut self, r: f64) {
        self.restitution = r;
    }

    pub fn get_restitution(&self) -> f64 {
        return self.restitution;
    }
    pub fn update_particle_position(&mut self, index: usize, x: f64, y: f64) {
        if index < self.particles.len() {
            self.particles[index].pos = Vec2::new(x, y);
        }
    }

    pub fn update_particle_velocity(&mut self, index: usize, vx: f64, vy: f64) {
        if index < self.particles.len() {
            self.particles[index].vel = Vec2::new(vx, vy);
        }
    }

    pub fn update_particle_mass(&mut self, index: usize, mass: f64) {
        if index < self.particles.len() {
            self.particles[index].mass = mass;
        }
    }

    pub fn update_particle_charge(&mut self, index: usize, charge: f64) {
        if index < self.particles.len() {
            self.particles[index].charge = charge;
        }
    }

    pub fn update_particle_radius(&mut self, index: usize, radius: f32) {
        if index < self.particles.len() {
            self.particles[index].radius = radius;
        }
    }

    pub fn update_particle_color(&mut self, index: usize, color: u32) {
        if index < self.particles.len() {
            self.particles[index].color = color;
        }
    }

    // Update particle fixed state
    pub fn update_particle_fixed(&mut self, index: usize, fixed: bool) {
        if index < self.particles.len() {
            self.particles[index].fixed = fixed;
        }
    }

    // NOTE: Particle magnet strength removed; magnets carry strength instead
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone)]
pub struct Magnet {
    pub pos: Vec2,
    pub vel: Vec2,
    pub acc: Vec2,
    pub angle: f64, // orientation in radians; +x direction indicates North
    pub size: f32, // overall length of magnet (distance between pole centers)
    pub thickness: f32, // visual thickness
    pub mass: f64,
    pub color_north: u32,
    pub color_south: u32,
    pub strength: f64,
    pub fixed: bool,
}

#[wasm_bindgen]
impl Magnet {
    #[wasm_bindgen(constructor)]
    pub fn new(
        px: f64,
        py: f64,
        angle: f64,
        size: f32,
        thickness: f32,
        mass: f64,
        color_north: u32,
        color_south: u32,
        strength: f64,
        fixed: bool
    ) -> Magnet {
        Magnet {
            pos: Vec2::new(px, py),
            vel: Vec2::new(0.0, 0.0),
            acc: Vec2::new(0.0, 0.0),
            angle,
            size,
            thickness,
            mass,
            color_north,
            color_south,
            strength,
            fixed,
        }
    }

    pub fn new_simple(px: f64, py: f64, strength: f64) -> Magnet {
        Magnet {
            pos: Vec2::new(px, py),
            vel: Vec2::new(0.0, 0.0),
            acc: Vec2::new(0.0, 0.0),
            angle: 0.0,
            size: 60.0,
            thickness: 20.0,
            mass: 1.0,
            color_north: 0xff0000,
            color_south: 0x0000ff,
            strength,
            fixed: true,
        }
    }

    pub fn get_data(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self).unwrap()
    }

    pub fn is_fixed(&self) -> bool {
        self.fixed
    }
    pub fn set_fixed(&mut self, f: bool) {
        self.fixed = f;
    }
}

// Add quadtree acceleration method within an impl Universe block
impl Universe {
    fn calculate_electrostatic_accelerations_quadtree(&mut self) -> Vec<Vec2> {
        let n = self.particles.len();
        let mut accelerations = vec![Vec2::new(0.0, 0.0); n];

        if n == 0 {
            return accelerations;
        }

        // Rebuild quadtree
        let mut min = Vec2::new(f64::MAX, f64::MAX);
        let mut max = Vec2::new(f64::MIN, f64::MIN);

        for p in &self.particles {
            if p.pos.x < min.x {
                min.x = p.pos.x;
            }
            if p.pos.y < min.y {
                min.y = p.pos.y;
            }
            if p.pos.x > max.x {
                max.x = p.pos.x;
            }
            if p.pos.y > max.y {
                max.y = p.pos.y;
            }
        }

        // Add small padding
        let padding = 100.0;
        min = min - Vec2::new(padding, padding);
        max = max + Vec2::new(padding, padding);
        let dimensions = max - min;
        let center = min + dimensions * 0.5;

        self.quadtree.rebuild(&self.particles, dimensions, center);

        for i in 0..n {
            let pos2d = Vec2::new(self.particles[i].pos.x, self.particles[i].pos.y);
            let particle_mass = if self.mass_calculation {
                self.particles[i].mass
            } else {
                self.default_mass
            };
            // Inline recursive quadtree evaluation to compute acceleration
            fn rec(
                quad: &QuadTreeNode,
                particle_pos: Vec2,
                particle_charge: f64,
                particle_mass: f64,
                theta: f64,
                coulomb_constant: f64,
                min_interaction_distance: f64
            ) -> Vec2 {
                if quad.charge == 0.0 {
                    return Vec2::new(0.0, 0.0);
                }
                let dx = quad.center_of_charge.x - particle_pos.x;
                let dy = quad.center_of_charge.y - particle_pos.y;
                let distance = f64::sqrt(dx * dx + dy * dy);
                if distance < 1e-10 {
                    return Vec2::new(0.0, 0.0);
                }
                let size = f64::max(quad.dimensions.x, quad.dimensions.y);
                let ratio = size / distance;

                if ratio < theta || quad.children.is_none() {
                    let distance_squared = distance * distance;
                    let min_dist = min_interaction_distance;
                    let min_dist_sq = min_dist * min_dist;
                    let safe_distance_squared = if distance_squared < min_dist_sq {
                        min_dist_sq
                    } else {
                        distance_squared
                    };
                    let safe_distance = f64::sqrt(safe_distance_squared);
                    let force_magnitude =
                        (coulomb_constant * quad.charge * particle_charge) / safe_distance_squared;
                    let acc_magnitude = force_magnitude / particle_mass;
                    let unit_x = (particle_pos.x - quad.center_of_charge.x) / safe_distance;
                    let unit_y = (particle_pos.y - quad.center_of_charge.y) / safe_distance;
                    Vec2::new(acc_magnitude * unit_x, acc_magnitude * unit_y)
                } else {
                    let mut acc = Vec2::new(0.0, 0.0);
                    if let Some(children) = &quad.children {
                        for child in children.iter() {
                            acc += rec(
                                child,
                                particle_pos,
                                particle_charge,
                                particle_mass,
                                theta,
                                coulomb_constant,
                                min_interaction_distance
                            );
                        }
                    }
                    acc
                }
            }

            let acc2d = rec(
                &self.quadtree,
                pos2d,
                self.particles[i].charge,
                particle_mass,
                self.quadtree_theta,
                self.coulomb_constant,
                self.min_interaction_distance
            );
            accelerations[i].x = acc2d.x;
            accelerations[i].y = acc2d.y;
        }

        // Include magnet dipole contributions
        for i in 0..n {
            let qi = self.particles[i].charge;
            let mi = if self.mass_calculation { self.particles[i].mass } else { self.default_mass };
            for m in &self.magnets {
                let half = (m.size as f64) * 0.5;
                let ux = f64::cos(m.angle);
                let uy = f64::sin(m.angle);
                let north = Vec2::new(m.pos.x + ux * half, m.pos.y + uy * half);
                let south = Vec2::new(m.pos.x - ux * half, m.pos.y - uy * half);
                let pole_n = m.strength * 0.5;
                let pole_s = -m.strength * 0.5;

                // North pole
                {
                    let rx = self.particles[i].pos.x - north.x;
                    let ry = self.particles[i].pos.y - north.y;
                    let dist_sq = rx * rx + ry * ry;
                    let min_dist = self.min_interaction_distance;
                    let min_dist_sq = min_dist * min_dist;
                    let safe_dist_sq = if dist_sq < min_dist_sq { min_dist_sq } else { dist_sq };
                    let dist = f64::sqrt(safe_dist_sq);
                    if dist > 1e-8 {
                        let force_magnitude = (self.coulomb_constant * qi * pole_n) / safe_dist_sq;
                        let acc_magnitude = force_magnitude / mi;
                        accelerations[i].x += acc_magnitude * (rx / dist);
                        accelerations[i].y += acc_magnitude * (ry / dist);
                    }
                }

                // South pole
                {
                    let rx = self.particles[i].pos.x - south.x;
                    let ry = self.particles[i].pos.y - south.y;
                    let dist_sq = rx * rx + ry * ry;
                    let min_dist = self.min_interaction_distance;
                    let min_dist_sq = min_dist * min_dist;
                    let safe_dist_sq = if dist_sq < min_dist_sq { min_dist_sq } else { dist_sq };
                    let dist = f64::sqrt(safe_dist_sq);
                    if dist > 1e-8 {
                        let force_magnitude = (self.coulomb_constant * qi * pole_s) / safe_dist_sq;
                        let acc_magnitude = force_magnitude / mi;
                        accelerations[i].x += acc_magnitude * (rx / dist);
                        accelerations[i].y += acc_magnitude * (ry / dist);
                    }
                }
            }
        }

        accelerations
    }
}
