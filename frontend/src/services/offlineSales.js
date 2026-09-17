import api from './api.jsx';

const STORAGE_KEY = 'mercado-nascimento-vendas-pendentes';

const lerFila = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

export const enfileirarVenda = venda => {
  const fila = lerFila();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...fila, venda]));
};

export const sincronizarVendas = async () => {
  if (!navigator.onLine) return 0;
  const fila = lerFila();
  let sincronizadas = 0;
  const restantes = [];
  for (const venda of fila) {
    try {
      await api.post('/orders', venda);
      sincronizadas += 1;
    } catch {
      restantes.push(venda);
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(restantes));
  return sincronizadas;
};
