// Menu responsivo e destaque de FAQ. Sem rastreamento, sem cookies, sem chamadas externas.
(() => {
  const btn = document.querySelector('.menu-btn');
  const menu = document.getElementById('menu');
  if (btn && menu) {
    btn.addEventListener('click', () => {
      const open = menu.classList.toggle('aberto');
      btn.setAttribute('aria-expanded', String(open));
    });
  }
  const busca = document.getElementById('busca-ajuda');
  if (busca) {
    const itens = [...document.querySelectorAll('.faq details')];
    const vazio = document.getElementById('busca-vazia');
    busca.addEventListener('input', () => {
      const q = busca.value.trim().toLowerCase();
      let n = 0;
      for (const d of itens) {
        const hit = !q || d.textContent.toLowerCase().includes(q);
        d.hidden = !hit;
        if (hit) n++;
        if (q && hit) d.open = true;
      }
      if (vazio) vazio.hidden = n > 0;
    });
  }
})();
