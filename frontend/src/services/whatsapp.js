export const enviarMensagemWhatsApp = (mensagem, telefone = '') => {
  const texto = encodeURIComponent(mensagem);
  // Remove o prefixo zero do cadastro e preserva o DDI quando já informado.
  const digitos = String(telefone ?? '').replace(/\D/g, '').replace(/^0+/, '');
  const numero = digitos
    ? (digitos.startsWith('55') && [12, 13].includes(digitos.length)
      ? digitos
      : `55${digitos}`)
    : '';
  const protocolo = numero
    ? `whatsapp://send?phone=${numero}&text=${texto}`
    : `whatsapp://send?text=${texto}`;
  const fallback = numero
    ? `https://wa.me/${numero}?text=${texto}`
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
