import React from 'react';

function DangerZone() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-red-900 mb-4">Danger Zone</h1>
      <div className="bg-white border-2 border-red-200 shadow rounded-lg p-6">
        <p className="text-red-700">Danger zone functionality will be implemented here.</p>
      </div>
    </div>
  );
}

export default DangerZone;