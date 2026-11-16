(() => {
  const KEY = 'aurix.roteiros.v1';
  const $ = (id) => document.getElementById(id);
  const MODELOS = {
    lista: { gancho: 'Você está cometendo pelo menos um destes [N] erros com [tema].', corpo: 'Erro 1: [o erro] — [por que atrapalha] — [o que fazer].\nErro 2: …\nErro 3: … (deixe o mais surpreendente por último)', cta: 'Salve para não esquecer e me conta qual erro você cometia.' },
    antes: { gancho: 'Olha a diferença que [mudança] fez em [resultado].', corpo: 'Antes: [situação inicial, mostre na tela].\nO que mudou: [1 a 3 passos concretos].\nDepois: [resultado, mostre na tela].', cta: 'Quer o passo a passo completo? Comenta “[palavra]”.' },
    tutorial: { gancho: 'Como [resultado] em [tempo] sem [dificuldade comum].', corpo: 'Passo 1: …\nPasso 2: …\nPasso 3: …\nDica extra: [o detalhe que quase ninguém conta].', cta: 'Segue para mais tutoriais como este.' },
    historia: { gancho: '[Momento de tensão em uma frase].', corpo: 'Contexto: [onde/quando, em 1 frase].\nO problema: …\nA virada: …\nO que aprendi: …', cta: 'Já passou por algo parecido? Conta nos comentários.' },
    mito: { gancho: 'Todo mundo diz que [crença comum]. Não é bem assim.', corpo: 'Mito: [crença].\nVerdade: [o que acontece de fato, com fonte se houver].\nNa prática: [o que fazer].', cta: 'Manda para alguém que ainda acredita nisso.' },
  };
  let rascunhos = carregar();
  let atual = null;

  function carregar() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
  function persistir() {
    try { localStorage.setItem(KEY, JSON.stringify(rascunhos)); return true; }
    catch { say('Não consegui salvar neste navegador. Copie o roteiro para não perder.', 'erro'); return false; }
  }
  const say = (t, cls = '') => { $('msg').textContent = t; $('msg').className = 'msg ' + cls; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const palavras = (t) => (t.trim().match(/\S+/g) || []).length;

  function texto() {
    return `${$('titulo').value.trim() || 'Roteiro'}\n\nGANCHO\n${$('gancho').value.trim()}\n\nDESENVOLVIMENTO\n${$('corpo').value.trim()}\n\nCTA\n${$('cta').value.trim()}`;
  }

  function calcular() {
    const ritmo = Number($('ritmo').value) / 60;
    const pg = palavras($('gancho').value), pc = palavras($('corpo').value), pt = palavras($('cta').value);
    const seg = Math.round((pg + pc + pt) / ritmo);
    $('duracao').textContent = seg >= 60 ? `${Math.floor(seg / 60)} min ${seg % 60} s` : `${seg} s`;
    const sg = (pg / ritmo).toFixed(1);
    $('detalhe').textContent = `${pg + pc + pt} palavras · gancho ≈ ${sg} s${pg / ritmo > 4 ? ' (longo: tente caber em 3 s)' : ''}`;
  }

  function render() {
    if (!rascunhos.length) { $('lista').innerHTML = '<div class="item"><small>Nenhum rascunho salvo.</small></div>'; return; }
    $('lista').innerHTML = rascunhos.slice().reverse().map((r) => `
      <div class="item">
        <div class="topo-item"><b>${esc(r.titulo || 'Sem título')}</b><small>${new Date(r.atualizado).toLocaleString('pt-BR')}</small></div>
        <small>${esc(r.gancho).slice(0, 140)}</small>
        <div class="acoes"><button class="mini" data-abrir="${r.id}">Abrir</button><button class="mini" data-apagar="${r.id}">Apagar</button></div>
      </div>`).join('');
  }

  ['gancho', 'corpo', 'cta', 'ritmo'].forEach((id) => $(id).addEventListener('input', calcular));
  $('modelo').addEventListener('change', () => {
    const m = MODELOS[$('modelo').value];
    if (!m) return;
    if (($('gancho').value || $('corpo').value) && !confirm('Substituir o texto atual pelo modelo?')) return;
    $('gancho').value = m.gancho; $('corpo').value = m.corpo; $('cta').value = m.cta;
    calcular();
  });
  $('salvar').addEventListener('click', () => {
    const dados = { titulo: $('titulo').value.trim(), gancho: $('gancho').value, corpo: $('corpo').value, cta: $('cta').value, atualizado: Date.now() };
    if (!dados.gancho.trim() && !dados.corpo.trim()) return say('Escreva pelo menos o gancho ou o desenvolvimento.', 'erro');
    if (atual) rascunhos = rascunhos.map((r) => (r.id === atual ? { ...r, ...dados } : r));
    else { atual = String(Date.now()); rascunhos.push({ id: atual, ...dados }); }
    if (persistir()) say('Rascunho salvo neste aparelho.', 'ok');
    render();
  });
  $('copiar').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(texto()); say('Roteiro copiado.', 'ok'); }
    catch { say('Não consegui copiar automaticamente. Selecione o texto e copie manualmente.', 'erro'); }
  });
  $('novo').addEventListener('click', () => {
    atual = null;
    ['titulo', 'gancho', 'corpo', 'cta'].forEach((id) => ($(id).value = ''));
    $('modelo').value = '';
    calcular(); say('');
  });
  $('lista').addEventListener('click', (e) => {
    const abrir = e.target.dataset.abrir, apagar = e.target.dataset.apagar;
    if (abrir) {
      const r = rascunhos.find((x) => x.id === abrir);
      atual = r.id;
      ['titulo', 'gancho', 'corpo', 'cta'].forEach((id) => ($(id).value = r[id] || ''));
      calcular(); window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (apagar && confirm('Apagar este rascunho?')) {
      rascunhos = rascunhos.filter((x) => x.id !== apagar);
      if (atual === apagar) atual = null;
      persistir(); render();
    }
  });
  calcular();
  render();
})();
