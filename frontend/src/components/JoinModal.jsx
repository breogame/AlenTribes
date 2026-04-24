import { useState } from 'react';

export default function JoinModal({ onSubmit, defaultName = '' }) {
  const [name, setName] = useState(defaultName);

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim().slice(0, 40));
  }

  return (
    <div className="modal-overlay" data-testid="join-modal">
      <form className="modal-panel" style={{ maxWidth: 420 }} onSubmit={submit}>
        <h2 className="font-display text-2xl mb-2" style={{ color: '#f3d58c', margin: 0 }}>
          Entrar a la sala
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          ¿Cómo te llaman en esta partida?
        </p>
        <input
          className="dark-input mb-4"
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          data-testid="join-name-input"
          maxLength={40}
        />
        <button className="brass-btn w-full" type="submit" data-testid="join-submit">
          Entrar
        </button>
      </form>
    </div>
  );
}
