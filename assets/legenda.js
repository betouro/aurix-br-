(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = 'aurix.legenda.rascunho';
  const LIMITES = [
    ['Instagram — legenda', 2200],
    ['TikTok — legenda', 4000],
    ['YouTube — título', 100],
    ['YouTube — descrição', 5000],
    ['X — post', 280],
    ['LinkedIn — post', 3000],
    ['Facebook — post', 63206],
    ['Pinterest — título', 100],
    ['Pinterest — descrição', 500],
    ['Twitch — título da live', 140],
  ];
  // Conta como as redes contam: por caractere visível (emoji = 1), não por byte.
  const contar = (t) => [...new Intl.Segmenter('pt-BR', { granularity: 'grapheme' }).segment(t)].length;
  const hashtags = (t) => t.match(/#[\p{L}\p{N}_]+/gu) || [];
  const say = (t, cls = '') => { $('msg').textContent = t; $('msg').className = 'msg ' + cls; };

  function render() {
    const t = $('texto').value;
    const n = contar(t);
    const tags = hashtags(t);
    const unicas = new Set(tags.map((h) => h.toLowerCase()));
    const palavras = (t.trim().match(/\S+/g) || []).length;
    $('resumo').textContent = `${n} caracteres · ${palavras} palavras · ${tags.length} hashtags${tags.length !== unicas.size ? ` (${tags.length - unicas.size} repetida(s))` : ''} · ${t.split('\n').length} linhas`;
    $('medidores').innerHTML = LIMITES.map(([nome, lim]) => {
      const pct = Math.min(100, (n / lim) * 100);
      const excedeu = n > lim;
      return `<div class="card medidor${excedeu ? ' excedeu' : ''}"><div class="topo-item" style="display:flex;justify-content:space-between"><span>${nome}</span><b>${n.toLocaleString('pt-BR')} / ${lim.toLocaleString('pt-BR')}</b></div><div class="barra"><i style="width:${pct}%"></i></div><small>${excedeu ? `Passou ${(n - lim).toLocaleString('pt-BR')} caracteres` : `Restam ${(lim - n).toLocaleString('pt-BR')}`}</small></div>`;
    }).join('');
    try { localStorage.setItem(KEY, t); } catch { /* sem armazenamento: segue sem salvar */ }
  }

  async function copiar(texto, ok) {
    try { await navigator.clipboard.writeText(texto); say(ok, 'ok'); }
    catch { say('Não consegui copiar automaticamente. Selecione e copie manualmente.', 'erro'); }
  }

  $('texto').addEventListener('input', render);
  $('copiar').addEventListener('click', () => copiar($('texto').value, 'Legenda copiada.'));
  $('copiar-tags').addEventListener('click', () => {
    const tags = [...new Set(hashtags($('texto').value))];
    if (!tags.length) return say('Nenhuma hashtag encontrada.', 'erro');
    copiar(tags.join(' '), `${tags.length} hashtag(s) copiada(s).`);
  });
  $('limpar-tags').addEventListener('click', () => {
    const vistas = new Set();
    $('texto').value = $('texto').value.replace(/#[\p{L}\p{N}_]+/gu, (h) => {
      const k = h.toLowerCase();
      if (vistas.has(k)) return '';
      vistas.add(k);
      return h;
    }).replace(/[ \t]{2,}/g, ' ');
    render();
    say('Hashtags repetidas removidas.', 'ok');
  });
  try { $('texto').value = localStorage.getItem(KEY) || ''; } catch { /* ignora */ }
  render();
})();
