import React from 'react';
import { KitchenStation } from '../../types';

interface StationSelectorProps {
  currentStation: KitchenStation | null;
  onStationChange: (station: KitchenStation | null) => void;
}

const stations: { value: KitchenStation; label: string; icon: string }[] = [
  { value: 'KITCHEN', label: 'Cocina', icon: '🍳' },
  { value: 'BAR', label: 'Bar', icon: '🍺' },
  { value: 'GRILL', label: 'Parrilla', icon: '🥩' },
  { value: 'DESSERTS', label: 'Postres', icon: '🍰' },
];

const StationSelector: React.FC<StationSelectorProps> = ({
  currentStation,
  onStationChange,
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onStationChange(null)}
        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
          currentStation === null
            ? 'bg-neon-orange text-charcoal-900'
            : 'bg-charcoal-700 text-gray-300 hover:bg-charcoal-600'
        }`}
      >
        Todas
      </button>
      {stations.map((station) => (
        <button
          key={station.value}
          onClick={() => onStationChange(station.value)}
          className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
            currentStation === station.value
              ? 'bg-neon-orange text-charcoal-900'
              : 'bg-charcoal-700 text-gray-300 hover:bg-charcoal-600'
          }`}
        >
          <span>{station.icon}</span>
          <span>{station.label}</span>
        </button>
      ))}
    </div>
  );
};

export default StationSelector;
