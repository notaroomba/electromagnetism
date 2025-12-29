import React, { useState } from 'react';
import { useSimulation } from '../contexts/SimulationContext';

type ParticleType = 'regular' | 'fixed' | 'magnet';

interface AddItemSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddItemSidebar: React.FC<AddItemSidebarProps> = ({ isOpen, onClose }) => {
  const { universe, addParticle } = useSimulation();
  const [selectedType, setSelectedType] = useState<ParticleType>('regular');
  const [isFixed, setIsFixed] = useState(false);
  const [count, setCount] = useState(1);

  const handleAdd = () => {
    for (let i = 0; i < count; i++) {
      // Random position within spawn range
      const spawnRange = universe.get_spawn_range();
      const x = (Math.random() - 0.5) * 2 * spawnRange;
      const y = (Math.random() - 0.5) * 2 * spawnRange;

      const vx = 0;
      const vy = 0;
      const radius = 5;
      const mass = universe.get_default_mass();
      const charge = universe.get_default_charge();

      let color = 0; // 0 means auto color
      const fixed = selectedType === 'fixed' || selectedType === 'magnet';
      const magnetStrength = selectedType === 'magnet' ? 1.0 : 0.0;

      universe.add_particle(x, y, vx, vy, radius, mass, color, charge, fixed, magnetStrength);
    }
    onClose();
  };

  const handleRemove = () => {
    const particles = universe.get_particles();
    for (let i = 0; i < Math.min(count, particles.length); i++) {
      universe.remove_particle(particles.length - 1 - i);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-gray-800 text-white p-4 shadow-lg z-50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Add Item</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">×</button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Particle Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ParticleType)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
          >
            <option value="regular">Regular</option>
            <option value="fixed">Fixed</option>
            <option value="magnet">Magnet</option>
          </select>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isFixed || selectedType === 'magnet'}
              disabled={selectedType === 'magnet'}
              onChange={(e) => setIsFixed(e.target.checked)}
              className="mr-2"
            />
            Fixed (immovable but influential)
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Count</label>
          <input
            type="number"
            min="1"
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
          />
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleAdd}
            className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Add {count} Particle{count > 1 ? 's' : ''}
          </button>
          <button
            onClick={handleRemove}
            className="flex-1 bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Remove {count}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddItemSidebar;
