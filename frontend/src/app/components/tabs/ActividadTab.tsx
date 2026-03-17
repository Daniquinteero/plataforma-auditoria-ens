import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Clock } from 'lucide-react';
import { fetchAuditActivity } from '../../../lib/api';

type ActivityItem = {
  id: string;
  action: string;
  user: string;
  timestamp: string;
};

export function ActividadTab() {
  const { auditId } = useParams();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadActivity() {
      if (!auditId) {
        setError('Missing auditId');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data = await fetchAuditActivity(auditId);
        setActivities(data);
      } catch (err) {
        console.error('Error loading activity:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadActivity();
  }, [auditId]);

  return (
    <div className="p-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Historial de actividad</h2>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-gray-500">Cargando actividad...</div>
          ) : error ? (
            <div className="text-red-600">Error: {error}</div>
          ) : activities.length === 0 ? (
            <div className="text-gray-500">No hay actividad registrada</div>
          ) : (
            <div className="space-y-6">
              {activities.map((activity, index) => (
                <div key={activity.id} className="flex gap-4">
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    {index < activities.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-200 mt-2" style={{ minHeight: '24px' }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-900 font-medium mb-1">{activity.action}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>{activity.user}</span>
                        <span>•</span>
                        <span>{activity.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}