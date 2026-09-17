export const enviarMensagemWhatsApp = (mensagem, telefone = '') => {
  const texto = encodeURIComponent(mensagem);
  const numero = telefone.replace(/\D/g, '');
  const protocolo = numero
    ? `whatsapp://send?phone=55${numero}&text=${texto}`
    : `whatsapp://send?text=${texto}`;
  const fallback = numero
    ? `https://wa.me/55${numero}?text=${texto}`
    : `https://wa.me/?text=${texto}`;

  const iframe = document.createElement('iframe');
  let saiuDaPagina = false;
  const marcarSaida = () => { saiuDaPagina = true; };
  window.addEventListener('pagehide', marcarSaida, { once: true });
  document.addEventListener('visibilitychange', marcarSaida, { once: true });
  iframe.style.display = 'none';
  iframe.src = protocolo;
  document.body.appendChild(iframe);

  window.setTimeout(() => {
    iframe.remove();
    window.removeEventListener('pagehide', marcarSaida);
    document.removeEventListener('visibilitychange', marcarSaida);
    if (!saiuDaPagina) window.open(fallback, '_blank', 'noopener,noreferrer');
  }, 1200);
};
