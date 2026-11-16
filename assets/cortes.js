// Cortes de vídeo 100% no navegador: canvas (reenquadramento) + MediaRecorder (gravação).
(() => {
  const $ = (id) => document.getElementById(id);
  const video = $('video'), previa = $('previa'), msg = $('msg');
  const ctrls = ['inicio', 'fim', 'marcar-inicio', 'marcar-fim', 'formato', 'posicao', 'gerar'].map($);
  const ASPECT = { '9:16': [1080, 1920], '1:1': [1080, 1080], '4:5': [1080, 1350], '16:9': [1920, 1080] };
  let url = null, gravando = null, audioCtx = null, audioSrc = null;

  const say = (t, cls = '') => { msg.textContent = t; msg.className = 'msg ' + cls; };
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  function mimeSuportado() {
    if (typeof MediaRecorder === 'undefined') return null;
    const opts = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return opts.find((t) => MediaRecorder.isTypeSupported(t)) || null;
  }

  /** Retângulo de origem (crop) para a proporção desejada. */
  function recorte(vw, vh, alvoW, alvoH, pos) {
    const alvo = alvoW / alvoH;
    let sw = vw, sh = vh;
    if (vw / vh > alvo) sw = vh * alvo; else sh = vw / alvo;
    const p = pos / 100;
    return [(vw - sw) * p, (vh - sh) * p, sw, sh];
  }

  function desenhar(canvas) {
    if (!video.videoWidth) return;
    const [W, H] = ASPECT[$('formato').value];
    const c = canvas.getContext('2d');
    const [sx, sy, sw, sh] = recorte(video.videoWidth, video.videoHeight, W, H, Number($('posicao').value));
    c.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  }

  function atualizarPrevia() {
    const [W, H] = ASPECT[$('formato').value];
    const escala = 480 / Math.max(W, H);
    previa.width = Math.round(W * escala);
    previa.height = Math.round(H * escala);
    desenhar(previa);
  }

  $('arquivo').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(f);
    video.src = url;
    $('palco').hidden = false;
    $('baixar').hidden = true;
    say('Carregando vídeo…');
  });

  video.addEventListener('loadedmetadata', () => {
    if (!isFinite(video.duration)) return say('Não consegui ler a duração deste vídeo. Tente outro arquivo.', 'erro');
    ctrls.forEach((el) => (el.disabled = false));
    $('inicio').max = $('fim').max = video.duration.toFixed(1);
    $('inicio').value = 0;
    $('fim').value = Math.min(video.duration, 30).toFixed(1);
    say(`Vídeo de ${fmt(video.duration)} (${video.videoWidth}×${video.videoHeight}). Ajuste o trecho e o formato.`);
    if (!mimeSuportado()) {
      $('gerar').disabled = true;
      say('Este navegador não grava vídeo. No iPhone, atualize o iOS e use o Safari.', 'erro');
    }
  });
  video.addEventListener('loadeddata', atualizarPrevia);
  video.addEventListener('seeked', atualizarPrevia);
  video.addEventListener('timeupdate', () => { if (!gravando) atualizarPrevia(); });
  video.addEventListener('error', () => say('Formato de vídeo não suportado por este navegador.', 'erro'));
  $('formato').addEventListener('change', atualizarPrevia);
  $('posicao').addEventListener('input', atualizarPrevia);
  $('marcar-inicio').addEventListener('click', () => { $('inicio').value = video.currentTime.toFixed(1); });
  $('marcar-fim').addEventListener('click', () => { $('fim').value = video.currentTime.toFixed(1); });

  async function gerar() {
    const ini = Number($('inicio').value), fim = Number($('fim').value);
    if (!(fim > ini)) return say('O fim precisa ser depois do início.', 'erro');
    if (fim > video.duration + 0.05) return say('O fim passa da duração do vídeo.', 'erro');
    const mime = mimeSuportado();
    const [W, H] = ASPECT[$('formato').value];
    // Resolução de saída: até 1080 no lado menor, limitada à resolução de origem para não perder nitidez à toa.
    const fator = Math.min(1, Math.min(video.videoWidth, video.videoHeight) / Math.min(W, H));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round((W * fator) / 2) * 2;
    canvas.height = Math.round((H * fator) / 2) * 2;

    const stream = canvas.captureStream(30);
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      await audioCtx.resume();
      audioSrc = audioSrc || audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      audioSrc.disconnect();
      audioSrc.connect(dest);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch { /* vídeo sem áudio ou navegador sem suporte: segue só com imagem */ }

    const partes = [];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    rec.ondataavailable = (e) => e.data.size && partes.push(e.data);
    gravando = { rec, cancelado: false };

    video.pause();
    video.currentTime = ini;
    await new Promise((r) => video.addEventListener('seeked', r, { once: true }));

    ctrls.forEach((el) => (el.disabled = true));
    $('cancelar').hidden = false;
    $('baixar').hidden = true;

    const fimGravacao = new Promise((r) => (rec.onstop = r));
    rec.start(500);
    await video.play();
    const total = fim - ini;
    const passo = () => {
      if (!gravando) return;
      desenhar(canvas);
      const feito = Math.max(0, video.currentTime - ini);
      say(`Gravando corte… ${Math.min(100, Math.round((feito / total) * 100))}% (mantenha esta tela aberta)`);
      if (video.currentTime >= fim || video.ended || gravando.cancelado) {
        video.pause();
        if (rec.state !== 'inactive') rec.stop();
        return;
      }
      requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
    await fimGravacao;

    const cancelado = gravando.cancelado;
    gravando = null;
    stream.getTracks().forEach((t) => t.stop());
    if (audioSrc) { audioSrc.disconnect(); audioSrc.connect(audioCtx.destination); }
    ctrls.forEach((el) => (el.disabled = false));
    $('cancelar').hidden = true;
    if (cancelado) return say('Corte cancelado.');

    const blob = new Blob(partes, { type: mime.split(';')[0] });
    const ext = mime.includes('mp4') ? 'mp4' : 'webm';
    const a = $('baixar');
    if (a.href) URL.revokeObjectURL(a.href);
    a.href = URL.createObjectURL(blob);
    a.download = `aurix-corte-${$('formato').value.replace(':', 'x')}-${Date.now()}.${ext}`;
    a.hidden = false;
    say(`Pronto: ${fmt(total)} em ${canvas.width}×${canvas.height}, ${(blob.size / 1048576).toFixed(1)} MB. Toque em "Baixar vídeo".`, 'ok');
  }

  $('gerar').addEventListener('click', () => gerar().catch((err) => {
    gravando = null;
    ctrls.forEach((el) => (el.disabled = false));
    $('cancelar').hidden = true;
    say('Não foi possível gerar o corte: ' + err.message, 'erro');
  }));
  $('cancelar').addEventListener('click', () => { if (gravando) gravando.cancelado = true; });
})();
