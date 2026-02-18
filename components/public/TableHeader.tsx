import React from 'react';

interface TableHeaderProps {
  tableName: string;
}

const TableHeader: React.FC<TableHeaderProps> = ({ tableName }) => {
  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-charcoal-800 to-charcoal-900 border-b-2 border-neon-orange shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neon-orange">{tableName}</h1>
            <p className="text-sm text-gray-400">Realiza tu pedido</p>
          </div>
          <div className="bg-neon-orange/20 border border-neon-orange/50 rounded-lg px-4 py-2">
            <p className="text-xs text-neon-orange uppercase font-semibold">Dine-in</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableHeader;
