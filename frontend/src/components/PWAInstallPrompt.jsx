import { useEffect, useState } from 'react';

export default function PWAInstallPrompt() {
  const [evento, setEvento] = useState(null);

  useEffect(() => {
    const capturar = e => {
      e.preventDefault();
      setEvento(e);
    };
    window.addEventListener('beforeinstallprompt', capturar);
    return () => window.removeEventListener('beforeinstallprompt', capturar);
  }, []);

  if (!evento) return null;

  const instalar = async () => {
    await evento.prompt();
    setEvento(null);
  };

  return (
    <div className="pwa-install-banner" role="status">
      <div>
        <strong>Mercado Nascimento</strong>
        <span>Instale o app para vender mais rápido.</span>
      </div>
      <button type="button" onClick={instalar}>Instalar App</button>
    </div>
  );
}
