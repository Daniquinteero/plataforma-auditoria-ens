import { Plus, Search, Settings, ShieldCheck, Trash2 } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { useEffect, useState } from 'react';
import { deleteAudit, fetchAudits } from '../../lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

type Audit = {
  id: string;
  name: string;
  org: string;
  ens_category: string;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export function Sidebar() {
  const navigate = useNavigate();
  const { auditId } = useParams();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState('');
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [auditToDelete, setAuditToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const auditToDeleteData = audits.find((a) => a.id === auditToDelete);


  const handleDeleteClick = (e: React.MouseEvent, auditIdToDelete: string) => {
    e.stopPropagation();
    setAuditToDelete(auditIdToDelete);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!auditToDelete) return;

    try {
      setDeleting(true);
      await deleteAudit(auditToDelete);

      if (auditId === auditToDelete) {
        navigate('/');
      }

      setDeleteDialogOpen(false);
      setAuditToDelete(null);

      await loadAudits();
    } catch (err) {
      console.error('Error deleting audit:', err);
      setError(err instanceof Error ? err.message : 'Error deleting audit');
    } finally {
      setDeleting(false);
    }
  };


  async function loadAudits() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAudits();
      setAudits(data);
    } catch (err) {
      console.error('Error loading audits:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAudits();
  }, [location.pathname]);

  const filteredAudits = audits.filter(
    (audit) =>
      audit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (audit.org ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-60 bg-slate-900 text-white flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-6 h-6 text-blue-400" />
          <h1 className="text-lg font-semibold">Auditoría ENS</h1>
        </div>

        {/* Nueva auditoría button */}
        <button
          onClick={() => navigate('/create')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="font-medium">Nueva auditoría</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar auditoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 text-white pl-10 pr-3 py-2 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Audit List */}
      <div className="sidebar-scroll flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 text-sm text-slate-400">
            Cargando auditorías...
          </div>
        )}

        {error && (
          <div className="p-4 text-sm text-red-400">
            Error: {error}
          </div>
        )}

        {!loading && !error && filteredAudits.length === 0 && (
          <div className="p-4 text-sm text-slate-400">
            No se encontraron auditorías
          </div>
        )}

        {!loading &&
          !error &&
          filteredAudits.map((audit) => (
            <div
              key={audit.id}
              className={`relative group w-full border-b border-slate-800 ${
                auditId === audit.id ? 'bg-slate-800 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <button
                onClick={() => navigate(`/audit/${audit.id}`)}
                className="w-full p-4 pr-12 text-left hover:bg-slate-800 transition-colors"
              >
                <div className="text-sm font-medium text-white mb-1">{audit.name}</div>
                <div className="text-xs text-slate-400">{audit.org}</div>
              </button>

              <button
                onClick={(e) => handleDeleteClick(e, audit.id)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-700 transition-all"
                aria-label="Eliminar auditoría"
              >
                <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
              </button>
            </div>
          ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium">
            DQ
          </div>
          <div className="flex-1">
            <div className="text-xs text-slate-400">Auditor</div>
            <div className="text-sm font-medium">Daniel Quintero</div>
          </div>
          <button className="text-slate-400 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar auditoría?</AlertDialogTitle>
            <AlertDialogDescription>
              {auditToDeleteData && (
                <>
                  Estás a punto de eliminar la auditoría <strong>"{auditToDeleteData.name}"</strong>
                  {auditToDeleteData.org ? <> de {auditToDeleteData.org}</> : null}.
                  <br />
                  <br />
                  Esta acción no se puede deshacer. Se eliminarán todos los datos asociados,
                  incluidos controles auditados, evidencias y actividad registrada.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleting}
            >
              {deleting ? 'Eliminando...' : 'Eliminar auditoría'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  );
}