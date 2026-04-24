import { useState } from 'react';
import { FACTION_COLORS } from '@/lib/cardUtils';
import { X } from 'lucide-react';

function NumberField({ label, value, onChange, min, step = 1 }) {
  return (
    <label className="flex flex-col gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
      <span className="label-caps" style={{ fontSize: '0.6rem' }}>{label}</span>
      <input
        type="number"
        step={step}
        className="dark-input"
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value === '' ? '' : Number(e.target.value);
          if (typeof min === 'number' && typeof v === 'number' && v < min) {
            onChange(min);
          } else {
            onChange(v === '' ? min ?? 0 : v);
          }
        }}
      />
    </label>
  );
}

export default function CreateCardModal({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name || 'Nuevo personaje',
    imageUrl: initial?.imageUrl || '',
    colorKey: initial?.colorKey || 'ashen',
    fortaleza: initial?.fortaleza ?? 1,
    destreza: initial?.destreza ?? 1,
    astucia: initial?.astucia ?? 1,
    inteligencia: initial?.inteligencia ?? 1,
    meleeSkill: initial?.meleeSkill ?? 0,
    rangedSkill: initial?.rangedSkill ?? 0,
    meleeMod: initial?.meleeMod ?? 0,
    rangedMod: initial?.rangedMod ?? 0,
    description: initial?.description || '',
  }));
  const [preview, setPreview] = useState(form.imageUrl || '');

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleImageFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      update('imageUrl', reader.result);
      setPreview(reader.result);
    };
    reader.readAsDataURL(f);
  }

  function submit() {
    if (!form.name?.trim()) return;
    onSubmit({
      ...form,
      name: form.name.trim().slice(0, 40),
      fortaleza: Math.max(1, Number(form.fortaleza) || 1),
      destreza: Math.max(1, Number(form.destreza) || 1),
      astucia: Math.max(1, Number(form.astucia) || 1),
      inteligencia: Math.max(1, Number(form.inteligencia) || 1),
      meleeSkill: Math.max(0, Number(form.meleeSkill) || 0),
      rangedSkill: Math.max(0, Number(form.rangedSkill) || 0),
      meleeMod: Number(form.meleeMod) || 0,
      rangedMod: Number(form.rangedMod) || 0,
    });
  }

  return (
    <div className="modal-overlay" onClick={onCancel} data-testid="create-card-modal">
      <div className="modal-panel wide" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl" style={{ color: '#f3d58c', margin: 0 }}>
            {initial ? 'Editar carta' : 'Crear carta'}
          </h2>
          <button className="icon-btn" onClick={onCancel} data-testid="create-card-close"><X size={14} /></button>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="label-caps">Nombre</span>
              <input
                className="dark-input"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                data-testid="create-card-name"
                maxLength={40}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="label-caps">Imagen (archivo o URL)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFile}
                data-testid="create-card-image-file"
                className="text-sm"
              />
              <input
                className="dark-input mt-1"
                placeholder="https://..."
                value={form.imageUrl}
                onChange={(e) => { update('imageUrl', e.target.value); setPreview(e.target.value); }}
                data-testid="create-card-image-url"
              />
              {preview && (
                <img
                  src={preview}
                  alt="preview"
                  style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginTop: 6 }}
                />
              )}
            </label>

            <div>
              <div className="label-caps mb-2">Bando</div>
              <div className="flex gap-2 items-center">
                {FACTION_COLORS.map((f) => (
                  <button
                    key={f.key}
                    className={`faction-swatch ${form.colorKey === f.key ? 'is-selected' : ''}`}
                    style={{ background: f.value }}
                    onClick={() => update('colorKey', f.key)}
                    title={f.name}
                    type="button"
                    data-testid={`create-card-faction-${f.key}`}
                  />
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="label-caps">Descripción</span>
              <textarea
                className="dark-input"
                rows={5}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                data-testid="create-card-description"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Fortaleza" value={form.fortaleza} onChange={(v) => update('fortaleza', v)} min={1} />
            <NumberField label="Destreza" value={form.destreza} onChange={(v) => update('destreza', v)} min={1} />
            <NumberField label="Astucia" value={form.astucia} onChange={(v) => update('astucia', v)} min={1} />
            <NumberField label="Inteligencia" value={form.inteligencia} onChange={(v) => update('inteligencia', v)} min={1} />
            <NumberField label="Habilidad C/C" value={form.meleeSkill} onChange={(v) => update('meleeSkill', v)} min={0} />
            <NumberField label="Habilidad distancia" value={form.rangedSkill} onChange={(v) => update('rangedSkill', v)} min={0} />
            <NumberField label="Mod arma C/C" value={form.meleeMod} onChange={(v) => update('meleeMod', v)} />
            <NumberField label="Mod arma distancia" value={form.rangedMod} onChange={(v) => update('rangedMod', v)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button className="ghost-btn" onClick={onCancel} data-testid="create-card-cancel">Cancelar</button>
          <button className="brass-btn" onClick={submit} data-testid="create-card-submit">
            {initial ? 'Guardar cambios' : 'Crear carta'}
          </button>
        </div>
      </div>
    </div>
  );
}
