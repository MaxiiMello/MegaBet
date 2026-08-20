import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../store/authStore';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

const COLOR_OPTIONS = [
  { value: 'green', label: 'Verde 🟢', bg: 'rgba(0,230,118,0.12)', border: 'var(--color-brand-green)', text: 'var(--color-brand-green)' },
  { value: 'red',   label: 'Rojo 🔴',  bg: 'rgba(255,23,68,0.12)',  border: 'var(--color-brand-red)',   text: 'var(--color-brand-red)' },
  { value: 'blue',  label: 'Azul 🔵',  bg: 'rgba(41,121,255,0.12)', border: 'var(--color-brand-blue)',  text: 'var(--color-brand-blue)' },
];

function OptionEditor({ index, option, onChange, canRemove, onRemove }) {
  const color = COLOR_OPTIONS.find((c) => c.value === option.color) || COLOR_OPTIONS[index];

  return (
    <div className="p-4 rounded-xl flex flex-col gap-3"
      style={{ background: color.bg, border: `1.5px solid ${color.border}` }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: color.text }}>
          Opción {index + 1}
        </span>
        {canRemove && (
          <button onClick={onRemove} className="text-text-muted hover:text-brand-red text-xs transition-colors">
            ✕ Quitar
          </button>
        )}
      </div>

      <input
        id={`option-label-${index}`}
        type="text"
        placeholder={`Ej: "Sí obvio", "Ni en pedo"...`}
        value={option.label}
        onChange={(e) => onChange({ ...option, label: e.target.value })}
        className="w-full px-3 py-2 rounded-lg text-sm font-semibold outline-none"
        style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--color-text-primary)',
        }}
      />

      <div className="flex items-center gap-2">
        <label className="text-xs text-text-muted font-semibold flex-shrink-0">Cuota inicial:</label>
        <input
          id={`option-odds-${index}`}
          type="number"
          step="0.05"
          min="1.05"
          max="20"
          value={option.initial_odds}
          onChange={(e) => onChange({ ...option, initial_odds: e.target.value })}
          className="w-24 px-3 py-1.5 rounded-lg text-sm font-black outline-none text-center"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: color.text,
          }}
        />
        <span className="text-xs text-text-muted">x</span>
      </div>

      {/* Color picker */}
      <div className="flex gap-2">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange({ ...option, color: c.value })}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: option.color === c.value ? c.bg : 'rgba(0,0,0,0.2)',
              border: `1.5px solid ${option.color === c.value ? c.border : 'transparent'}`,
              color: option.color === c.value ? c.text : 'var(--color-text-muted)',
            }}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CreateBet() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageMode, setImageMode] = useState('url'); // 'url' | 'upload'
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [options, setOptions] = useState([
    { label: '', color: 'green', initial_odds: '2.00' },
    { label: '', color: 'red',   initial_odds: '2.00' },
  ]);
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateOption = (i, val) => setOptions((prev) => prev.map((o, idx) => idx === i ? val : o));
  const addOption = () => setOptions((prev) => [...prev, { label: '', color: 'blue', initial_odds: '2.00' }]);
  const removeOption = (i) => setOptions((prev) => prev.filter((_, idx) => idx !== i));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('options', JSON.stringify(options.map((o) => ({
        ...o,
        initial_odds: parseFloat(o.initial_odds),
      }))));

      if (imageMode === 'upload' && imageFile) {
        formData.append('image', imageFile);
      } else if (imageMode === 'url' && imageUrl) {
        formData.append('image_url', imageUrl);
      }

      await api.post('/bets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('🎰 ¡Apuesta creada! ¡A jugar!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear la apuesta');
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  };

  const isValid = title.trim() && options.every((o) => o.label.trim() && parseFloat(o.initial_odds) >= 1.05);

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
      <h1 className="text-2xl font-black text-text-primary mb-6">➕ Crear Apuesta</h1>

      <div className="flex flex-col gap-5">
        {/* Título */}
        <div>
          <label className="block text-xs font-bold mb-2 uppercase tracking-widest text-text-muted">
            Título *
          </label>
          <input
            id="create-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="¿Qué se va a definir?"
            className="w-full px-4 py-3 rounded-xl text-sm font-semibold outline-none"
            style={{
              background: 'var(--color-brand-card)',
              border: '1.5px solid var(--color-brand-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-xs font-bold mb-2 uppercase tracking-widest text-text-muted">
            Descripción (opcional)
          </label>
          <textarea
            id="create-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dale contexto al grupo..."
            rows={2}
            className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none resize-none"
            style={{
              background: 'var(--color-brand-card)',
              border: '1.5px solid var(--color-brand-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* Imagen */}
        <div>
          <label className="block text-xs font-bold mb-2 uppercase tracking-widest text-text-muted">
            Imagen (opcional)
          </label>
          <div className="flex gap-2 mb-3">
            {['url', 'upload'].map((mode) => (
              <button key={mode} onClick={() => setImageMode(mode)}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: imageMode === mode ? 'var(--color-brand-surface)' : 'var(--color-brand-card)',
                  border: `1.5px solid ${imageMode === mode ? 'var(--color-brand-border)' : 'transparent'}`,
                  color: imageMode === mode ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                }}>
                {mode === 'url' ? '🔗 URL' : '📁 Subir archivo'}
              </button>
            ))}
          </div>

          {imageMode === 'url' ? (
            <input
              id="create-image-url"
              type="url"
              value={imageUrl}
              onChange={(e) => { setImageUrl(e.target.value); setImagePreview(e.target.value); }}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none"
              style={{
                background: 'var(--color-brand-card)',
                border: '1.5px solid var(--color-brand-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          ) : (
            <label id="create-image-upload" className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl cursor-pointer transition-all hover:border-text-muted"
              style={{
                background: 'var(--color-brand-card)',
                border: '2px dashed var(--color-brand-border)',
              }}>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <span className="text-3xl">{imageFile ? '✅' : '🖼️'}</span>
              <span className="text-xs font-semibold text-text-muted">
                {imageFile ? imageFile.name : 'Click para subir imagen'}
              </span>
            </label>
          )}

          {imagePreview && (
            <div className="mt-3 rounded-xl overflow-hidden">
              <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" onError={() => setImagePreview('')} />
            </div>
          )}
        </div>

        {/* Opciones */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold uppercase tracking-widest text-text-muted">
              Opciones * ({options.length}/3)
            </label>
            {options.length < 3 && (
              <button onClick={addOption}
                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                style={{ background: 'rgba(0,230,118,0.12)', color: 'var(--color-brand-green)', border: '1px solid var(--color-brand-green)' }}>
                + Agregar opción
              </button>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {options.map((opt, i) => (
              <OptionEditor
                key={i}
                index={i}
                option={opt}
                onChange={(val) => updateOption(i, val)}
                canRemove={options.length > 2}
                onRemove={() => removeOption(i)}
              />
            ))}
          </div>
        </div>

        {/* Botón crear */}
        <button
          id="create-bet-submit"
          onClick={() => setConfirm(true)}
          disabled={!isValid}
          className="w-full py-4 rounded-xl font-black text-base transition-all active:scale-95 disabled:opacity-40 mt-2"
          style={{ background: 'var(--color-brand-green)', color: '#000' }}>
          🎰 Crear Apuesta
        </button>
      </div>

      <ConfirmModal
        isOpen={confirm}
        onCancel={() => setConfirm(false)}
        onConfirm={handleSubmit}
        isLoading={loading}
        title="¿Publicar esta apuesta?"
        message={`"${title}" — ${options.length} opciones. Todos podrán verla y apostar.`}
        confirmText="🎰 Publicar ahora"
        emoji="🚀"
      />
    </div>
  );
}
