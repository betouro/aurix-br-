(() => {
  const KEY = 'aurix.calendario.v1';
  const $ = (id) => document.getElementById(id);
  const campos = ['titulo', 'data', 'hora', 'rede', 'formato', 'status', 'notas'];
  let itens = carregar();

  function carregar() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  }
  function salvar() {
    try { localStorage.setItem(KEY, JSON.stringify(itens)); return true; } catch {
      say('Não consegui salvar neste navegador (modo privado?). Exporte um backup para não perder.', 'erro');
      return false;
    }
  }
  const say = (t, cls = '') => { $('msg').textContent = t; $('msg').className = 'msg ' + cls; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dataBR = (d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

  function render() {
    const f = $('filtro').value;
    const lista = itens.filter((i) => !f || i.status === f).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    if (!lista.length) {
      $('lista').innerHTML = `<div class="item"><small>${itens.length ? 'Nada com esse filtro.' : 'Nenhuma publicação ainda. Preencha o formulário acima para planejar a primeira.'}</small></div>`;
      return;
    }
    $('lista').innerHTML = lista.map((i) => `
      <div class="item">
        <div class="topo-item"><b>${esc(i.titulo)}</b><small class="st-${i.status}">● ${i.status}</small></div>
        <small>${dataBR(i.data)} ${esc(i.hora || '')} · ${esc(i.rede)} · ${esc(i.formato)}</small>
        ${i.notas ? `<small>${esc(i.notas).slice(0, 220)}${i.notas.length > 220 ? '…' : ''}</small>` : ''}
        <div class="acoes">
          <button class="mini" data-acao="editar" data-id="${i.id}">Editar</button>
          ${i.status !== 'publicado' ? `<button class="mini" data-acao="publicado" data-id="${i.id}">Marcar publicado</button>` : ''}
          <button class="mini" data-acao="apagar" data-id="${i.id}">Apagar</button>
        </div>
      </div>`).join('');
  }

  function limpar() {
    $('form').reset();
    $('id').value = '';
    $('hora').value = '19:00';
    $('data').value = new Date().toISOString().slice(0, 10);
    $('salvar').textContent = 'Adicionar';
  }

  $('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(campos.map((c) => [c, $(c).value.trim()]));
    const id = $('id').value;
    if (id) itens = itens.map((i) => (i.id === id ? { ...i, ...dados } : i));
    else itens.push({ id: crypto.randomUUID?.() || String(Date.now()), ...dados });
    if (salvar()) say(id ? 'Publicação atualizada.' : 'Publicação adicionada.', 'ok');
    limpar();
    render();
  });
  $('limpar').addEventListener('click', limpar);
  $('filtro').addEventListener('change', render);

  $('lista').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-acao]');
    if (!b) return;
    const item = itens.find((i) => i.id === b.dataset.id);
    if (!item) return;
    if (b.dataset.acao === 'editar') {
      campos.forEach((c) => ($(c).value = item[c] ?? ''));
      $('id').value = item.id;
      $('salvar').textContent = 'Salvar alterações';
      $('titulo').focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (b.dataset.acao === 'publicado') {
      item.status = 'publicado'; salvar(); render();
    } else if (b.dataset.acao === 'apagar' && confirm(`Apagar "${item.titulo}"?`)) {
      itens = itens.filter((i) => i !== item); salvar(); render();
    }
  });

  function baixar(nome, tipo, conteudo) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  $('exportar').addEventListener('click', () => {
    baixar(`aurix-calendario-${new Date().toISOString().slice(0, 10)}.json`, 'application/json', JSON.stringify(itens, null, 2));
  });
  $('importar').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const novos = JSON.parse(await f.text());
      if (!Array.isArray(novos) || novos.some((i) => !i.id || !i.titulo || !i.data)) throw new Error();
      const ids = new Set(itens.map((i) => i.id));
      const add = novos.filter((i) => !ids.has(i.id));
      itens.push(...add);
      salvar(); render();
      say(`${add.length} publicação(ões) importada(s).`, 'ok');
    } catch { say('Arquivo inválido. Use um backup exportado por esta página.', 'erro'); }
    e.target.value = '';
  });

  $('ics').addEventListener('click', () => {
    const futuros = itens.filter((i) => i.status !== 'publicado');
    if (!futuros.length) return say('Não há publicações pendentes para exportar.', 'erro');
    const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const ev = futuros.map((i) => {
      const [h, m] = (i.hora || '19:00').split(':');
      const ini = i.data.replace(/-/g, '') + 'T' + h + m + '00';
      return ['BEGIN:VEVENT', `UID:${i.id}@aurix-br`, `DTSTAMP:${stamp}`, `DTSTART:${ini}`, 'DURATION:PT30M',
        `SUMMARY:${icsEsc(`[${i.rede}] ${i.titulo}`)}`, `DESCRIPTION:${icsEsc(`${i.formato} · ${i.status}\n${i.notas || ''}`)}`,
        'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Publicação em 30 minutos', 'END:VALARM', 'END:VEVENT'].join('\r\n');
    });
    baixar('aurix-calendario.ics', 'text/calendar', ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AURIX BR//Calendario//PT-BR', ...ev, 'END:VCALENDAR'].join('\r\n'));
    say(`${futuros.length} publicação(ões) exportada(s). Abra o arquivo para adicionar ao Calendário, com lembrete 30 min antes.`, 'ok');
  });

  limpar();
  render();
})();
