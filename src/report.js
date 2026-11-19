// "Report a problem" button (top right, next to the DE/EN switch) for every tool.
// Opens a small form; the report goes to GitHub Issues of haxpure/3d-stuff (prefilled) or can be copied.
(function () {
  const REPO = 'haxpure/3d-stuff';
  const FILE = location.pathname.split('/').pop() || 'index.html';
  const TOOL = { 'relief-maker.html': 'Relief Maker', 'town-maker.html': 'Town Maker', 'fin-studio.html': 'Fin Studio' }[FILE] || FILE;
  const KEYS = { 'relief-maker.html': /^reliefMaker(?!Presets|Feat)/, 'town-maker.html': /^townMaker/ }[FILE] || null;
  // keep the last script errors for the report
  const errs = [];
  addEventListener('error', e => { errs.push(String(e.message || e.error || 'error') + (e.filename ? ` @${e.filename.split('/').pop()}:${e.lineno}` : '')); if (errs.length > 5) errs.shift(); });
  addEventListener('unhandledrejection', e => { errs.push('Promise: ' + String(e.reason && e.reason.message || e.reason)); if (errs.length > 5) errs.shift(); });

  const css = document.createElement('style');
  css.textContent = `
  #repBtn{position:fixed;top:10px;right:12px;z-index:1000;display:flex;background:rgba(17,19,23,.88);border:1px solid #262a33;border-radius:8px;padding:3px}
  #repBtn button{width:auto;background:transparent;color:#8b919c;border:0;border-radius:5px;padding:4px 9px;font:600 12px Inter,system-ui,sans-serif;cursor:pointer;white-space:nowrap}
  #repBtn button:hover{color:#f6c21c}
  #repDlg{position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;padding:16px;font:14px/1.45 Inter,system-ui,sans-serif;color:#e8eaee}
  #repDlg.on{display:flex}
  #repDlg .box{width:100%;max-width:440px;background:#181b21;border:1px solid #262a33;border-radius:12px;padding:18px;box-shadow:0 20px 50px rgba(0,0,0,.45);max-height:92vh;overflow:auto}
  #repDlg h2{font:700 18px Poppins,Inter,sans-serif;margin:0 0 4px}
  #repDlg p{margin:0 0 10px;color:#8b919c;font-size:13px}
  #repDlg textarea{width:100%;min-height:120px;background:#0f1115;color:#e8eaee;border:1px solid #262a33;border-radius:8px;padding:10px;font:inherit;resize:vertical;box-sizing:border-box}
  #repDlg textarea:focus{outline:none;border-color:#f6c21c}
  #repDlg label{display:flex;gap:8px;align-items:flex-start;margin:10px 0 0;color:#c7cbd3;font-size:13px;cursor:pointer}
  #repDlg label input{margin-top:3px;accent-color:#f6c21c}
  #repDlg .b{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
  #repDlg .b button{border:0;border-radius:8px;padding:10px;font:600 13px Inter,sans-serif;cursor:pointer;background:#262a33;color:#e8eaee}
  #repDlg .b button.p{background:#f6c21c;color:#111}
  #repDlg .x{float:right;width:auto;background:none;border:0;color:#8b919c;font-size:20px;cursor:pointer;line-height:1;padding:0 2px}
  #repDlg small{display:block;color:#8b919c;font-size:12px;margin-top:10px}
  #repDlg .ok{color:#5fd68a}`;
  document.head.appendChild(css);

  function build() {
    const bar = document.createElement('div'); bar.id = 'repBtn';
    bar.innerHTML = '<button type="button" title="Report a problem with this tool">⚑ Report a problem</button>';
    document.body.appendChild(bar);
    const dlg = document.createElement('div'); dlg.id = 'repDlg';
    dlg.innerHTML = `<div class="box" role="dialog" aria-modal="true">
      <button type="button" class="x" title="Close">×</button>
      <h2>Report a problem</h2>
      <p>What happened, and what did you expect? Steps to repeat it help a lot.</p>
      <textarea id="repText" placeholder="e.g. After changing the filament color the preview stays yellow."></textarea>
      <label><input type="checkbox" id="repSet" checked><span>Attach current settings (contains the address / coordinates)</span></label>
      <div class="b"><button type="button" id="repCopy">Copy text</button><button type="button" class="p" id="repGh">Send via GitHub</button></div>
      <small>GitHub opens with the report filled in; you only need to press "Create" (GitHub account needed). Without an account: copy the text and send it to the owner.</small>
      <small id="repMsg"></small></div>`;
    document.body.appendChild(dlg);
    const $ = id => document.getElementById(id), open = on => { dlg.classList.toggle('on', on); if (on) setTimeout(() => $('repText').focus(), 50); };
    bar.querySelector('button').addEventListener('click', () => { $('repMsg').textContent = ''; open(true); });
    dlg.querySelector('.x').addEventListener('click', () => open(false));
    dlg.addEventListener('click', e => { if (e.target === dlg) open(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });

    function report(max) {
      const text = $('repText').value.trim();
      const info = [`- Tool: ${TOOL} (${FILE})`, `- Page version: ${document.lastModified}`,
        `- Browser: ${navigator.userAgent}`, `- Screen: ${innerWidth}×${innerHeight} @${devicePixelRatio}x`, `- Language: ${document.documentElement.lang || navigator.language}`];
      if (errs.length) info.push('- Script errors:\n' + errs.map(e => '  - ' + e).join('\n'));
      let set = '';
      if ($('repSet').checked && KEYS) {
        const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (KEYS.test(k)) { try { o[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { o[k] = localStorage.getItem(k); } } }
        set = JSON.stringify(o);
      }
      let body = `### Problem\n${text || '(no description)'}\n\n### Details\n${info.join('\n')}\n`;
      if (set) { const room = Math.max(0, max - body.length - 60); body += `\n### Settings\n\`\`\`json\n${set.length > room ? set.slice(0, room) + ' …(cut)' : set}\n\`\`\`\n`; }
      const title = `[${TOOL}] ` + (text.split('\n')[0].slice(0, 70) || 'Problem report');
      return { title, body };
    }
    $('repGh').addEventListener('click', () => {
      if (!$('repText').value.trim()) { $('repMsg').textContent = 'Please describe the problem first.'; $('repMsg').className = ''; return; }
      const r = report(5000);   // GitHub links must stay short
      open(false);
      window.open(`https://github.com/${REPO}/issues/new?title=${encodeURIComponent(r.title)}&body=${encodeURIComponent(r.body)}&labels=bug`, '_blank', 'noopener');
    });
    $('repCopy').addEventListener('click', async () => {
      const r = report(20000), t = r.title + '\n\n' + r.body;
      try { await navigator.clipboard.writeText(t); }
      catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
      $('repMsg').textContent = 'Copied. Paste it into a message to the owner.'; $('repMsg').className = 'ok';
    });
    // sit left of the DE/EN switch (it is added by the translator, maybe a bit later)
    const place = () => { const sw = document.getElementById('langSw'); bar.style.right = (sw ? sw.getBoundingClientRect().width + 18 : 12) + 'px'; };
    place(); setTimeout(place, 300); setTimeout(place, 1500); addEventListener('resize', place);
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
