import React from 'react';
import { useToast } from '../../contexts/ToastContext';

interface TableQRManagerProps {
  tableId: number;
  tableName: string;
  onClose: () => void;
}

const TableQRManager: React.FC<TableQRManagerProps> = ({ tableId, tableName, onClose }) => {
  const { showToast } = useToast();

  // Static URL — printed once, works forever
  const tableUrl = `${window.location.origin}/mesa/${tableId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tableUrl)}`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('No se pudo abrir la ventana de impresión', 'error');
      return;
    }

    const printQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(tableUrl)}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR - ${tableName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 40px;
              margin: 0;
            }
            h1 { margin-bottom: 6px; font-size: 48px; }
            .subtitle { font-size: 20px; color: #444; margin-bottom: 4px; }
            img { margin: 24px 0; max-width: 400px; }
            .instructions { margin-top: 24px; font-size: 16px; color: #555; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>${tableName}</h1>
          <p class="subtitle">Escaneá para ver el menú y pedir</p>
          <img src="${printQrUrl}" alt="QR Code" />
          <div class="instructions">
            <p>1. Escaneá el código QR con tu celular</p>
            <p>2. Explorá el menú y agregá lo que quieras</p>
            <p>3. Confirmá tu pedido — ¡llega directo a cocina!</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleCopyURL = () => {
    navigator.clipboard.writeText(tableUrl);
    showToast('URL copiada al portapapeles', 'success');
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-charcoal-800 rounded-xl border-2 border-neon-orange max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-neon-orange/20 to-transparent p-6 border-b border-neon-orange/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-neon-orange">Código QR — {tableName}</h2>
              <p className="text-xs text-gray-400 mt-1">QR fijo · imprimí una sola vez</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* QR */}
        <div className="p-6 space-y-5">
          <div className="bg-white rounded-xl p-6 flex items-center justify-center">
            <img src={qrImageUrl} alt={`QR ${tableName}`} className="w-56 h-56" />
          </div>

          {/* URL */}
          <div className="bg-charcoal-900/50 rounded-lg p-3 border border-gray-700">
            <p className="text-xs text-gray-500 mb-1">URL de la mesa</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-neon-orange break-all">{tableUrl}</code>
              <button
                onClick={handleCopyURL}
                className="bg-charcoal-700 hover:bg-charcoal-600 text-white px-3 py-2 rounded transition-colors text-sm"
                title="Copiar URL"
              >
                📋
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Este QR no expira. El cliente puede escanear en cualquier momento; si la mesa no está abierta, verá un aviso para llamar al mozo.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 bg-neon-orange text-charcoal-900 font-bold py-3 rounded-lg hover:bg-neon-orange/90 transition-colors"
            >
              🖨️ Imprimir
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-charcoal-700 text-white font-bold py-3 rounded-lg hover:bg-charcoal-600 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableQRManager;
