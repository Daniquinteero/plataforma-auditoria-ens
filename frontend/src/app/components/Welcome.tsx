import { ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useEffect, useState } from "react";
import { fetchAudits } from "../../lib/api";

export function Welcome() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAudits() {
      try {
        const data = await fetchAudits();
        setAudits(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadAudits();
  }, []); 


  if (loading) return <div>Loading audits...</div>;

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Plataforma de Auditoría ENS
        </h2>
        <p className="text-gray-600 mb-8">
          Selecciona una auditoría del panel lateral o crea una nueva para comenzar
        </p>
        <button
          onClick={() => navigate('/create')}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Crear nueva auditoría
        </button>

        
        <div className="mt-8 text-left">
          <pre className="text-xs bg-gray-100 p-4 rounded">
            {JSON.stringify(audits, null, 2)}
          </pre>
        </div>

      </div>
    </div>
  );
}
