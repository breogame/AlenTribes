import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Dices, ScrollText, Users, Cloud } from 'lucide-react';
import { toast } from 'sonner';
import { LOCAL_BACKEND_URL, CLOUD_BACKEND_URL } from '@/lib/backend';

export default function Landing() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinToken, setJoinToken] = useState('');

  useEffect(() => {
    document.title = 'Tablero de Rol · Streaming';
  }, []);

  async function createRoom(apiSource) {
    if (loading) return;
    setLoading(true);
    const backendUrl = apiSource === 'cloud' ? CLOUD_BACKEND_URL : LOCAL_BACKEND_URL;
    try {
      const { data } = await axios.post(`${backendUrl}/api/room/create`, {
        name: roomName || 'Partida de rol',
      });
      // persist GM credentials for this room locally
      localStorage.setItem(
        `rsb:gm:${data.token}`,
        JSON.stringify({
          gmSecret: data.gmSecret,
          name: 'Game Master',
          apiSource: apiSource || 'local',
        })
      );
      toast.success(apiSource === 'cloud' ? 'Sala cloud creada' : 'Sala creada');
      const apiQuery = apiSource === 'cloud' ? '&api=cloud' : '';
      navigate(`/room/${data.token}?gm=1${apiQuery}`);
    } catch (e) {
      const msg = apiSource === 'cloud'
        ? 'No se ha podido crear la sala cloud. ¿Está el backend accesible?'
        : 'No se ha podido crear la sala';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function joinRoom() {
    const token = joinToken.trim();
    if (!token) {
      toast.error('Introduce el código de la sala');
      return;
    }
    navigate(`/room/${token}`);
  }

  return (
    <div className="landing-root" data-testid="landing-root">
      <div className="landing-card" data-testid="landing-card">
        <div className="flex items-center gap-3 mb-6">
          <div
            style={{
              width: 46, height: 46, borderRadius: 10,
              background: 'linear-gradient(135deg, #B8860B, #4E3A0F)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(255,220,150,0.35)',
              boxShadow: '0 0 18px rgba(184,134,11,0.35)',
            }}
          >
            <Dices size={24} color="#1a1406" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl" style={{ color: '#f3d58c', margin: 0 }}>
              Tablero de Rol
            </h1>
            <p className="label-caps" style={{ marginTop: 2 }}>Asistente para streaming</p>
          </div>
        </div>

        <p className="text-base" style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
          Un tablero interactivo para tus partidas de rol en directo. Crea cartas de personaje,
          muévelas por el tablero, lanza dados y mantén el historial a la vista — todo sincronizado
          con tus jugadores en tiempo real.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Crear sala */}
          <div
            className="p-5 rounded-lg"
            style={{ background: 'rgba(20,20,26,0.7)', border: '1px solid rgba(184,134,11,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-3" style={{ color: '#e8cd8c' }}>
              <ScrollText size={18} />
              <h2 className="font-display text-xl" style={{ margin: 0 }}>Soy el Game Master</h2>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)', marginBottom: '0.9rem' }}>
              Crea una sala y comparte el enlace con tus jugadores.
            </p>
            <input
              className="dark-input mb-3"
              placeholder="Nombre de la partida (opcional)"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              data-testid="input-room-name"
              maxLength={80}
            />
            <button
              className="brass-btn w-full mb-2"
              onClick={() => createRoom('local')}
              disabled={loading}
              data-testid="btn-create-room"
            >
              {loading ? 'Creando…' : 'Crear sala'}
            </button>
            <button
              className="ghost-btn w-full flex items-center justify-center gap-2"
              onClick={() => createRoom('cloud')}
              disabled={loading}
              data-testid="btn-create-room-cloud"
              style={{
                borderColor: 'rgba(120, 200, 255, 0.3)',
                color: '#bfe3ff',
              }}
              title="Crea la sala en el servidor compartido en la nube"
            >
              <Cloud size={15} /> Nueva sesión cloud
            </button>
          </div>

          {/* Unirse */}
          <div
            className="p-5 rounded-lg"
            style={{ background: 'rgba(20,20,26,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-2 mb-3" style={{ color: '#c8efdc' }}>
              <Users size={18} />
              <h2 className="font-display text-xl" style={{ margin: 0 }}>Soy jugador/a</h2>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)', marginBottom: '0.9rem' }}>
              Introduce el código que te haya compartido tu GM.
            </p>
            <input
              className="dark-input mb-3"
              placeholder="Código de sala"
              value={joinToken}
              onChange={(e) => setJoinToken(e.target.value)}
              data-testid="input-join-token"
            />
            <button className="ghost-btn w-full" onClick={joinRoom} data-testid="btn-join-room">
              Entrar en la sala
            </button>
          </div>
        </div>

        <p className="text-xs mt-8 text-center" style={{ color: 'var(--text-muted)' }}>
          Sin base de datos: las cartas se guardan en el tablero mientras la sala esté abierta.
          Usa <strong>Guardar</strong> para exportar tus cartas en YAML/JSON.
        </p>
      </div>
    </div>
  );
}
