# 🌙 Modo Escuro - Documentação

## Visão Geral

O projeto agora possui um sistema completo de tema claro/escuro que funciona em todas as telas. A preferência do usuário é salva automaticamente no localStorage e persiste entre sessões.

## Componentes Principais

### 1. **ThemeContext** ([src/context/ThemeContext.jsx](src/context/ThemeContext.jsx))
Contexto global que gerencia o estado do tema.

**Funcionalidades:**
- ✅ Detecta preferência do sistema (`prefers-color-scheme`)
- ✅ Salva preferência no `localStorage`
- ✅ Aplica tema ao elemento `<html>` via `data-theme`
- ✅ Fornece função `toggleTheme()` para mudar o tema

**Uso:**
```jsx
import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext.jsx';

export default function MyComponent() {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  
  return (
    <button onClick={toggleTheme}>
      {isDark ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
    </button>
  );
}
```

### 2. **Theme CSS** ([src/styles/theme.css](src/styles/theme.css))
Define todas as variáveis CSS para os dois temas.

**Variáveis Disponíveis:**

#### Cores de Fundo
```css
--bg-primary     /* Fundo principal */
--bg-secondary   /* Fundo secundário (cards, containers) */
--bg-tertiary    /* Fundo terciário (hover, focus) */
--bg-hover       /* Fundo ao passar o mouse */
```

#### Cores de Texto
```css
--text-primary   /* Texto principal */
--text-secondary /* Texto secundário */
--text-tertiary  /* Texto terciário (placeholder, hints) */
```

#### Cores de Destaque
```css
--accent-primary    /* Cor primária de destaque */
--accent-secondary  /* Cor secundária de destaque */
--accent-light      /* Fundo claro do destaque */
--accent-border     /* Borda do destaque */
```

#### Estados
```css
--success-bg    /* Fundo de sucesso */
--success-text  /* Texto de sucesso */
--error-bg      /* Fundo de erro */
--error-text    /* Texto de erro */
--warning-bg    /* Fundo de aviso */
--warning-text  /* Texto de aviso */
--info-bg       /* Fundo de informação */
--info-text     /* Texto de informação */
```

#### Inputs
```css
--input-bg          /* Fundo de inputs */
--input-border      /* Borda de inputs */
--input-text        /* Cor do texto em inputs */
--input-placeholder /* Cor do placeholder */
```

#### Bordas e Sombras
```css
--border-color   /* Cor da borda padrão */
--border-light   /* Cor da borda clara */
--shadow-sm      /* Sombra pequena */
--shadow-md      /* Sombra média */
--shadow-lg      /* Sombra grande */
```

## Estrutura de Integração

### Integração Global (App.jsx)
```jsx
import { ThemeProvider } from './context/ThemeContext.jsx';

export default function App() {
  return (
    <ThemeProvider>
      {/* resto da aplicação */}
    </ThemeProvider>
  );
}
```

### Importar Estilos (main.jsx)
```jsx
import './styles/theme.css';
```

## Telas com Tema Implementado

- ✅ **Layout** - Navegação principal com toggle
- ✅ **Login** - Página de login com toggle
- ✅ **Toast** - Notificações com cores adaptadas
- ✅ Todas as páginas filhas (PDV, Produtos, Clientes, etc.)

## Como Usar o Tema nos Componentes

### Usando Variáveis CSS (Recomendado)

```jsx
<div style={{
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-color)',
  padding: '20px',
  borderRadius: '10px'
}}>
  Conteúdo com tema automático
</div>
```

### Usando o Contexto para Lógica Condicional

```jsx
import { ThemeContext } from '../context/ThemeContext.jsx';

export default function MyComponent() {
  const { isDark } = useContext(ThemeContext);
  
  return (
    <div style={{
      background: isDark ? '#1a1f2e' : '#ffffff'
    }}>
      Conteúdo condicional
    </div>
  );
}
```

### Usando Classes CSS

```jsx
<div className="card">
  Conteúdo com classe CSS
</div>
```

```css
.card {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
}
```

## Atualizar Componentes Existentes

Para adicionar suporte a tema em componentes existentes, siga este padrão:

### Antes (Hardcoded)
```jsx
<div style={{ background: '#ffffff', color: '#0f172a' }}>
  Conteúdo
</div>
```

### Depois (Com Variáveis CSS)
```jsx
<div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
  Conteúdo
</div>
```

## Cores Específicas de Cada Tema

### Modo Claro (Light)
| Elemento | Valor |
|----------|-------|
| Fundo Primário | #fefcf8 |
| Fundo Secundário | #ffffff |
| Texto Primário | #0f172a |
| Texto Secundário | #64748b |
| Destaque Primário | #ea580c |
| Sucesso | #16a34a |
| Erro | #dc2626 |

### Modo Escuro (Dark)
| Elemento | Valor |
|----------|-------|
| Fundo Primário | #0f1419 |
| Fundo Secundário | #1a1f2e |
| Texto Primário | #f3f4f6 |
| Texto Secundário | #d1d5db |
| Destaque Primário | #ff8a50 |
| Sucesso | #10b981 |
| Erro | #ef4444 |

## Transições Suaves

As transições entre temas são automáticas. Para adicionar efeitos customizados:

```jsx
<div style={{
  background: 'var(--bg-secondary)',
  transition: 'background-color 0.3s ease, color 0.3s ease'
}}>
  Conteúdo com transição suave
</div>
```

## Persistência do Tema

A preferência do usuário é salva no localStorage com a chave `'theme'`:
- `'light'` - Modo claro
- `'dark'` - Modo escuro

Ao recarregar a página, a preferência é restaurada automaticamente.

## Testando o Modo Escuro

1. Clique no botão de toggle (🌙/☀️) na sidebar ou header mobile
2. A página deve mudar de tema instantaneamente
3. Recarregue a página - o tema deve persistir
4. Abra DevTools → Preferences → Appearance para testar preferência do sistema

## Próximos Passos

Para manter a consistência, certifique-se de:
- [ ] Atualizar todas as páginas para usar variáveis CSS
- [ ] Atualizar componentes reutilizáveis
- [ ] Testar em diferentes navegadores
- [ ] Validar contraste de cores (WCAG)
- [ ] Adicionar suporte a temas customizados (opcional)

## Troubleshooting

### O tema não está mudando
- Verifique se o `ThemeProvider` envolve toda a aplicação
- Certifique-se de que `theme.css` está importado em `main.jsx`
- Verifique o console do navegador por erros

### Cores estranhas no modo escuro
- Verifique se todas as cores estão usando variáveis CSS
- Procure por cores hardcoded (`#fff`, `#000`, etc.)
- Use DevTools para inspecionar elementos

### Transição muito rápida/lenta
- Ajuste `transition-duration` nos estilos
- A duração padrão é `0.3s`

## Referências

- [MDN - CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [MDN - prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- [Web.dev - Dark Mode](https://web.dev/articles/prefers-color-scheme)
