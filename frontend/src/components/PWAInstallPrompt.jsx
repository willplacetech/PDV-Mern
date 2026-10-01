import { useEffect, useState } from 'react';

const STORAGE_KEY = 'pwa-install-dismissed';

export default function PWAInstallPrompt() {
  const [evento, setEvento] = useState(null);
  const [visivel, setVisivel] = useState(false);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    const jaInstalado = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (jaInstalado) {
      setInstalado(true);
      return;
    }

    const naoFoiFechado = !localStorage.getItem(STORAGE_KEY);
    setVisivel(naoFoiFechado);

    const capturar = (e) => {
      e.preventDefault();
      setEvento(e);
      setVisivel(true);
    };

    const aoInstalar = () => {
      setInstalado(true);
      setVisivel(false);
      setEvento(null);
    };

    window.addEventListener('beforeinstallprompt', capturar);
    window.addEventListener('appinstalled', aoInstalar);

    return () => {
      window.removeEventListener('beforeinstallprompt', capturar);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  if (instalado || !visivel) return null;

  const instalar = async () => {
    if (!evento) return;
    await evento.prompt();
    const escolha = await evento.userChoice;
    if (escolha.outcome === 'accepted') {
      setInstalado(true);
    }
    setEvento(null);
    setVisivel(false);
  };

  const fechar = () => {
    setVisivel(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 2000,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Instalar app"
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg-secondary)',
          borderRadius: 18,
          boxShadow: '0 18px 50px rgba(15, 23, 42, 0.22)',
          padding: 24,
          position: 'relative',
          color: 'var(--text-primary)',
        }}
      >
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar modal de instalação"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            border: 'none',
            background: 'transparent',
            fontSize: 22,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <div style={{ fontSize: 28 }}>📲</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Instalar o app</h3>
            <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Acesse o Mercado Nascimento com mais rapidez e sem depender do navegador.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={instalar}
              style={{
                flex: 1,
                minHeight: 44,
                border: 'none',
                borderRadius: 12,
                background: '#27ae60',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Instalar App
            </button>

            <button
              type="button"
              onClick={fechar}
              style={{
                minWidth: 116,
                minHeight: 44,
                border: '1px solid var(--border-color)',
                borderRadius: 12,
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
