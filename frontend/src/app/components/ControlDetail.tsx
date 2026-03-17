import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Link, FileText, Check, ChevronDown, Save } from 'lucide-react';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Select from '@radix-ui/react-select';

import {
  patchControl,
  saveControlAnswers,
  fetchControlEvidences,
  createControlEvidence,
  uploadControlEvidenceFile,
} from '../../lib/api';

type UiControl = {
  id: string;
  code: string;
  name: string;
  aplica: boolean;
  nivelObjetivo: string;
  estado: string;
  resultado: string;
  notes?: string | null;
  exclusionReason?: string | null;
};

type UiQuestion = {
  id: string;
  questionId?: string;
  text?: string;
  texto?: string;
  level?: string;
  minLevel?: string;
  answer?: string | null;
  comment?: string | null;
  answeredAt?: string | null;
};

type Evidence = {
  id: string;
  kind: string;
  description: string | null;
  uri: string;
  created_at: string;
};

interface ControlDetailProps {
  control: UiControl;
  questions: UiQuestion[];
  onControlUpdated?: () => void;
}

function getLevelColor(level: string) {
  switch (level) {
    case 'BÁSICA':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'MEDIA':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'ALTA':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

function mapUiStatusToApi(status: string) {
  switch (status) {
    case 'Pendiente':
      return 'PENDIENTE';
    case 'En progreso':
      return 'EN_PROGRESO';
    case 'Auditado':
      return 'AUDITADO';
    default:
      return 'PENDIENTE';
  }
}

function mapUiResultToApi(result: string) {
  switch (result) {
    case 'No evaluado':
      return 'NO_EVAL';
    case 'Cumple':
      return 'CUMPLE';
    case 'No cumple':
      return 'NO_CUMPLE';
    case 'Parcial':
      return 'PARCIAL';
    default:
      return 'NO_EVAL';
  }
}

export function ControlDetail({ control, questions, onControlUpdated }: ControlDetailProps) {
  const { auditId } = useParams();

  const [estado, setEstado] = useState(control.estado);
  const [resultado, setResultado] = useState(control.resultado);
  const [aplica, setAplica] = useState(control.aplica);
  const [notes, setNotes] = useState(control.notes || '');
  const [exclusionReason, setExclusionReason] = useState(control.exclusionReason || '');

  const [localQuestions, setLocalQuestions] = useState<UiQuestion[]>(questions);

  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [evidencesLoading, setEvidencesLoading] = useState(false);

  const [savingControl, setSavingControl] = useState(false);
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [savingEvidence, setSavingEvidence] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showUrlForm, setShowUrlForm] = useState(false);
  const [showTextForm, setShowTextForm] = useState(false);

  const [urlValue, setUrlValue] = useState('');
  const [urlDescription, setUrlDescription] = useState('');

  const [textValue, setTextValue] = useState('');
  const [textDescription, setTextDescription] = useState('');

  const [showFileForm, setShowFileForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    setEstado(control.estado);
    setResultado(control.resultado);
    setAplica(control.aplica);
    setNotes(control.notes || '');
    setExclusionReason(control.exclusionReason || '');
  }, [control]);

  useEffect(() => {
    setLocalQuestions(questions);
  }, [questions]);

  useEffect(() => {
    async function loadEvidences() {
      if (!auditId || !control?.code) return;

      try {
        setEvidencesLoading(true);
        const data = await fetchControlEvidences(auditId, control.code);
        setEvidences(data);
      } catch (err) {
        console.error('Error loading evidences:', err);
      } finally {
        setEvidencesLoading(false);
      }
    }

    loadEvidences();
  }, [auditId, control]);

  function updateQuestionAnswer(questionId: string, answer: string) {
    setLocalQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId || q.questionId === questionId
          ? { ...q, answer }
          : q
      )
    );
  }

  function updateQuestionComment(questionId: string, comment: string) {
    setLocalQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId || q.questionId === questionId
          ? { ...q, comment }
          : q
      )
    );
  }

  async function handleSaveControl() {
    if (!auditId) return;

    if (!aplica && !exclusionReason.trim()) {
      setError("Debe indicar un motivo de exclusión cuando la medida no aplica.");
      return;
    }

    try {
      setSavingControl(true);
      setError(null);
      setMessage(null);

      await patchControl(auditId, control.code, {
        audit_status: aplica ? mapUiStatusToApi(estado) : null,
        result: aplica ? mapUiResultToApi(resultado) : null,
        notes: aplica ? notes || null : null,
        applies: aplica,
        exclusion_reason: aplica ? null : exclusionReason.trim() || 'No aplica',
      });

      setMessage('Control actualizado correctamente');

      if (onControlUpdated) {
        await onControlUpdated();
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error guardando control');
    } finally {
      setSavingControl(false);
    }
  }

  async function handleSaveAnswers() {
    if (!auditId) return;

    try {
      setSavingAnswers(true);
      setError(null);
      setMessage(null);

      const payload = {
        answers: localQuestions.map((q) => ({
          question_id: q.id,
          answer: q.answer || 'NA',
          comment: q.comment || null,
        })),
      };

      const updatedQuestions = await saveControlAnswers(auditId, control.code, payload);

      setLocalQuestions(
        updatedQuestions.map((q: any) => ({
          id: q.id,
          questionId: q.id,
          text: q.texto,
          texto: q.texto,
          level: q.min_level === 'BASICA' ? 'BÁSICA' : q.min_level,
          minLevel: q.min_level === 'BASICA' ? 'BÁSICA' : q.min_level,
          answer: q.answer,
          comment: q.comment,
          answeredAt: q.answered_at,
        }))
      );

      setMessage('Respuestas guardadas correctamente');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error guardando respuestas');
    } finally {
      setSavingAnswers(false);
    }
  }

  async function handleCreateUrlEvidence() {
    if (!auditId || !urlValue.trim()) return;

    try {
      setSavingEvidence(true);
      setError(null);
      setMessage(null);

      const updated = await createControlEvidence(auditId, control.code, {
        kind: 'url',
        uri: urlValue.trim(),
        description: urlDescription.trim() || null,
      });

      setEvidences(updated);
      setUrlValue('');
      setUrlDescription('');
      setShowUrlForm(false);
      setMessage('Evidencia URL añadida correctamente');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error añadiendo evidencia URL');
    } finally {
      setSavingEvidence(false);
    }
  }

  async function handleCreateTextEvidence() {
    if (!auditId || !textValue.trim()) return;

    try {
      setSavingEvidence(true);
      setError(null);
      setMessage(null);

      const updated = await createControlEvidence(auditId, control.code, {
        kind: 'text',
        uri: textValue.trim(),
        description: textDescription.trim() || null,
      });

      setEvidences(updated);
      setTextValue('');
      setTextDescription('');
      setShowTextForm(false);
      setMessage('Nota/evidencia añadida correctamente');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error añadiendo evidencia');
    } finally {
      setSavingEvidence(false);
    }
  }

  async function handleUploadFileEvidence() {
    if (!auditId || !selectedFile) return;

    try {
      setSavingEvidence(true);
      setError(null);
      setMessage(null);

      const updated = await uploadControlEvidenceFile(
        auditId,
        control.code,
        selectedFile,
        fileDescription.trim() || null
      );

      setEvidences(updated);
      setSelectedFile(null);
      setFileDescription('');
      setShowFileForm(false);
      setMessage('Archivo subido correctamente');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error subiendo archivo');
    } finally {
      setSavingEvidence(false);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          setSelectedFile(file);
          break;
        }
      }
    }
  }

  return (
    <div className="p-6 space-y-6">
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {control.code} — {control.name}
        </h2>

        <div className="flex items-center gap-3 mb-6">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${getLevelColor(
              control.nivelObjetivo
            )}`}
          >
            Nivel objetivo: {control.nivelObjetivo}
          </span>
        </div>

        <div className={`grid gap-4 mb-4 ${aplica ? 'grid-cols-3' : 'grid-cols-1'}`}>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Checkbox.Root
                checked={aplica}
                onCheckedChange={(checked) => {
                  const nextAplica = checked === true;
                  setAplica(nextAplica);
                }}
                className="w-5 h-5 border-2 border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              >
                <Checkbox.Indicator>
                  <Check className="w-3 h-3 text-white" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              Aplica
            </label>
          </div>

          {aplica && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado de Auditoría
              </label>
              <Select.Root value={estado} onValueChange={setEstado}>
                <Select.Trigger className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white flex items-center justify-between text-sm">
                  <Select.Value />
                  <Select.Icon>
                    <ChevronDown className="w-4 h-4" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                    <Select.Viewport>
                      <Select.Item value="Pendiente" className="px-3 py-2 hover:bg-gray-100 cursor-pointer outline-none text-sm">
                        <Select.ItemText>Pendiente</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="En progreso" className="px-3 py-2 hover:bg-gray-100 cursor-pointer outline-none text-sm">
                        <Select.ItemText>En progreso</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="Auditado" className="px-3 py-2 hover:bg-gray-100 cursor-pointer outline-none text-sm">
                        <Select.ItemText>Auditado</Select.ItemText>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
          )}

          {aplica && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resultado</label>
              <Select.Root value={resultado} onValueChange={setResultado}>
                <Select.Trigger className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white flex items-center justify-between text-sm">
                  <Select.Value />
                  <Select.Icon>
                    <ChevronDown className="w-4 h-4" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                    <Select.Viewport>
                      <Select.Item value="No evaluado" className="px-3 py-2 hover:bg-gray-100 cursor-pointer outline-none text-sm">
                        <Select.ItemText>No evaluado</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="Cumple" className="px-3 py-2 hover:bg-gray-100 cursor-pointer outline-none text-sm">
                        <Select.ItemText>Cumple</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="No cumple" className="px-3 py-2 hover:bg-gray-100 cursor-pointer outline-none text-sm">
                        <Select.ItemText>No cumple</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="Parcial" className="px-3 py-2 hover:bg-gray-100 cursor-pointer outline-none text-sm">
                        <Select.ItemText>Parcial</Select.ItemText>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
          )}
        </div>

        {!aplica && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de exclusión
            </label>
            <input
              type="text"
              value={exclusionReason}
              onChange={(e) => setExclusionReason(e.target.value)}
              placeholder="Indica por qué este control no aplica"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !aplica && !exclusionReason ? "border-red-400" : "border-gray-300"
              }`}
            />
          </div>
        )}

        {aplica && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas del auditor
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade observaciones generales del control"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>
        )}

        <button
          onClick={handleSaveControl}
          disabled={savingControl}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Save className="w-4 h-4" />
          {savingControl ? 'Guardando...' : 'Guardar control'}
        </button>
      </div>

      {aplica && localQuestions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Preguntas de verificación</h3>
            <button
              onClick={handleSaveAnswers}
              disabled={savingAnswers}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {savingAnswers ? 'Guardando...' : 'Guardar respuestas'}
            </button>
          </div>

          <div className="space-y-6">
            {localQuestions.map((question) => {
              const qText = question.text || question.texto || '';
              const qLevel = question.level || question.minLevel || 'BÁSICA';
              const qAnswer = question.answer || null;
              const qComment = question.comment || '';

              return (
                <div key={question.id} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                  <div className="flex items-start gap-3 mb-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 mt-1 ${getLevelColor(
                        qLevel
                      )}`}
                    >
                      {qLevel === 'BÁSICA' ? '🟢' : qLevel === 'MEDIA' ? '🟡' : '🔴'}
                    </span>
                    <p className="text-sm text-gray-700 flex-1">{qText}</p>
                  </div>

                  <div className="ml-11 space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateQuestionAnswer(question.id, 'SI')}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                          qAnswer === 'SI'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        SI
                      </button>
                      <button
                        onClick={() => updateQuestionAnswer(question.id, 'NO')}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                          qAnswer === 'NO'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        NO
                      </button>
                      <button
                        onClick={() => updateQuestionAnswer(question.id, 'NA')}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                          qAnswer === 'NA'
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        NA
                      </button>
                    </div>

                    <textarea
                      placeholder="Comentario del auditor"
                      value={qComment}
                      onChange={(e) => updateQuestionComment(question.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {aplica && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Evidencias</h3>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setShowUrlForm((v) => !v);
                setShowTextForm(false);
                setShowFileForm(false);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Link className="w-4 h-4" />
              Añadir URL
            </button>

            <button
              onClick={() => {
                setShowTextForm((v) => !v);
                setShowUrlForm(false);
                setShowFileForm(false);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Añadir nota
            </button>

            <button
              onClick={() => {
                setShowFileForm((v) => !v);
                setShowUrlForm(false);
                setShowTextForm(false);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Subir archivo
            </button>
          </div>

          {showUrlForm && (
            <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
              <input
                type="text"
                placeholder="https://..."
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Descripción"
                value={urlDescription}
                onChange={(e) => setUrlDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={handleCreateUrlEvidence}
                disabled={savingEvidence}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium"
              >
                {savingEvidence ? 'Guardando...' : 'Guardar URL'}
              </button>
            </div>
          )}

          {showTextForm && (
            <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
              <textarea
                placeholder="Contenido / nota / evidencia textual"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                rows={3}
              />
              <input
                type="text"
                placeholder="Descripción"
                value={textDescription}
                onChange={(e) => setTextDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={handleCreateTextEvidence}
                disabled={savingEvidence}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium"
              >
                {savingEvidence ? 'Guardando...' : 'Guardar nota'}
              </button>
            </div>
          )}

          {showFileForm && (
            <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-4">
              <input
                id="file-upload-input"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
              />

              <div
                tabIndex={0}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onPaste={handlePaste}
                className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors outline-none ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="text-4xl text-gray-400">☁️</div>

                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Drag & Drop</span> files here
                  </div>

                  <div className="text-xs text-gray-400">or</div>

                  <label
                    htmlFor="file-upload-input"
                    className="inline-flex cursor-pointer items-center justify-center rounded-md border border-blue-400 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    Browse Files
                  </label>

                  <div className="text-xs text-gray-400">
                    También puedes pegar una imagen aquí con <span className="font-medium">Ctrl+V</span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-700">
                {selectedFile ? (
                  <>
                    Archivo seleccionado:{' '}
                    <span className="font-medium text-gray-900">{selectedFile.name}</span>
                  </>
                ) : (
                  <span className="text-gray-500">Ningún archivo seleccionado</span>
                )}
              </div>

              <input
                type="text"
                placeholder="Descripción"
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />

              <button
                onClick={handleUploadFileEvidence}
                disabled={savingEvidence || !selectedFile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium"
              >
                {savingEvidence ? 'Subiendo...' : 'Subir archivo'}
              </button>
            </div>
          )}

          {evidencesLoading ? (
            <p className="text-sm text-gray-500">Cargando evidencias...</p>
          ) : evidences.length > 0 ? (
            <div className="space-y-3">
              {evidences.map((evidence) => (
                <div
                  key={evidence.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          {evidence.kind}
                        </span>
                        <span className="text-xs text-gray-500">{evidence.created_at}</span>
                      </div>
                      {evidence.description && (
                        <p className="text-sm text-gray-900 mb-1">{evidence.description}</p>
                      )}
                      {evidence.kind === 'url' ? (
                        <a
                          href={evidence.uri}
                          className="text-sm text-blue-600 hover:underline inline-block break-all"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {evidence.uri}
                        </a>
                      ) : (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{evidence.uri}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hay evidencias para este control</p>
          )}
        </div>
      )}
    </div>
  );
}