export const adminHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>朝暮田事 · 管理后台</title>
  <link rel="stylesheet" href="/manage/app.css">
  <script defer src="/manage/app.js"></script>
</head>
<body>
  <main id="sign-in" class="login" hidden>
    <div class="brand"><span aria-hidden="true">田</span><strong>朝暮田事</strong></div>
    <h1>管理后台</h1>
    <form id="login-form">
      <label>账号<input name="username" autocomplete="username" required maxlength="32"></label>
      <label>密码<input name="password" type="password" autocomplete="current-password" required maxlength="160"></label>
      <p id="login-message" class="error" aria-live="polite"></p>
      <button class="primary" type="submit">登录</button>
    </form>
  </main>
  <div id="dashboard" class="workspace" hidden>
    <aside>
      <div class="brand"><span aria-hidden="true">田</span><strong>朝暮田事</strong></div>
      <nav aria-label="管理功能">
        <button data-view="overview">总览</button>
        <button data-view="users">用户</button>
        <button data-view="feedback">用户反馈</button>
        <button data-view="corrections">图鉴纠错</button>
      </nav>
      <button id="sign-out">退出登录</button>
    </aside>
    <main class="content">
      <header><h1 id="view-title">总览</h1><span id="signed-in"></span></header>
      <p id="notice" class="error" role="status"></p>
      <section id="view"></section>
    </main>
  </div>
  <noscript>请启用 JavaScript 后使用管理后台。</noscript>
</body>
</html>`;

export const adminCss = `
  :root{color-scheme:light;--ink:#24352a;--muted:#526259;--line:#d9ded4;--paper:#f7f7ef;--card:#fff;--accent:#335d45;--tint:#e8efe5;font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;color:var(--ink);background:var(--paper)}
  *{box-sizing:border-box}body{margin:0;min-height:100dvh}button,input{font:inherit}button{cursor:pointer}button:disabled{cursor:wait;opacity:.55}[hidden]{display:none!important}
  h1,h2,p{margin:0}h1{font-size:clamp(1.65rem,3vw,2.2rem);line-height:1.25}h2{font-size:1.15rem}
  a,button,input{touch-action:manipulation}input,button{border-radius:.65rem;border:1px solid var(--line)}button{padding:.53rem .95rem;background:var(--card);color:var(--ink)}
  button:hover{border-color:var(--accent)}button:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.primary{background:var(--accent);color:white;border-color:var(--accent)}
  .brand{display:flex;align-items:center;gap:.8rem}.brand span{display:grid;place-items:center;background:var(--tint);height:2.5rem;width:2.5rem;border-radius:.65rem;color:var(--accent);font-size:1.25rem;font-weight:700}
  .login{margin:10vh auto 2rem;max-width:27rem;width:calc(100% - 2rem);padding:2.3rem;background:var(--card);border:1px solid var(--line);border-radius:1.3rem}.login h1{margin:1.3rem 0 1.5rem}
  .login form,.login label{display:grid;gap:.55rem}.login form{gap:1rem}.login input{min-width:0;width:100%;padding:.6rem .7rem}.login .primary{width:100%}
  .workspace{display:grid;grid-template-columns:15rem minmax(0,1fr);min-height:100vh}aside{position:sticky;top:0;height:100vh;padding:1.5rem 1rem;display:flex;flex-direction:column;gap:1.8rem;border-right:1px solid var(--line);background:var(--card)}
  nav{display:grid;gap:.45rem}nav button{border-color:transparent;text-align:left}nav button[aria-current]{background:var(--tint);color:var(--accent);font-weight:700}#sign-out{margin-top:auto;align-self:flex-start}
  .content{width:100%;max-width:88rem;padding:2.3rem clamp(1.1rem,4vw,4rem)}header{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.7rem}#signed-in{color:var(--muted);font-size:.9rem}
  .metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:.8rem}.metric,.card{padding:1.2rem;background:var(--card);border:1px solid var(--line);border-radius:1rem}.metric{display:grid;gap:.35rem}.metric span{color:var(--muted)}.metric strong{font-size:2rem;font-variant-numeric:tabular-nums;color:var(--accent)}
  .hint{margin:1rem 0;color:var(--muted);font-size:.95rem}.filters,.actions{display:flex;align-items:center;flex-wrap:wrap;gap:.6rem;margin:0 0 1rem}.filters button[aria-pressed="true"]{background:var(--tint);border-color:var(--accent)}.cards{display:grid;gap:.8rem}
  .card .actions{margin:1rem 0 0}.card h2{margin-bottom:.35rem}.card p{overflow-wrap:anywhere;white-space:pre-wrap}.card time,.card .meta{color:var(--muted);font-size:.9rem}
  .table-wrap{overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:1rem}table{border-collapse:collapse;width:100%;text-align:left;white-space:nowrap}th,td{padding:.85rem 1rem;border-bottom:1px solid var(--line)}th{font-weight:600;color:var(--muted);background:var(--tint)}tr:last-child td{border-bottom:0}
  .preview{display:block;max-width:100%;max-height:55vh;object-fit:contain;margin:1rem 0;border-radius:.6rem}.preview-checks{display:grid;gap:.55rem;margin-bottom:1rem}.preview-checks input{margin-right:.55rem}.error{color:#9c3629}.error:empty{display:none}#notice{margin-bottom:.9rem}.empty{padding:1.5rem;color:var(--muted);background:var(--card);border-radius:1rem}
  @media(max-width:650px){.workspace{display:block}aside{position:static;height:auto;gap:.8rem;border-right:0;border-bottom:1px solid var(--line);padding:.9rem 1.1rem}nav{grid-template-columns:repeat(4,minmax(0,1fr))}nav button{text-align:center;padding:.5rem .2rem}#sign-out{width:auto;font-size:.85rem}.content{padding-top:1.25rem}header{margin-bottom:1rem}}
`;

export const adminScript = String.raw`(() => {
  const $ = id => document.getElementById(id);
  const root = $('view');
  const filters = {
    feedback: { open: '待处理', reviewing: '处理中', closed: '已完成' },
    corrections: { pending: '待核对', reviewed: '已核对', rejected: '未采纳' },
  };
  const labels = { overview: '总览', users: '用户', feedback: '用户反馈', corrections: '图鉴纠错' };
  let current = 'overview';
  let status = '';
  let page = 1;
  let pending = 0;

  function element(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }

  function button(label, click, className) {
    const el = element('button', label, className);
    el.type = 'button';
    el.addEventListener('click', click);
    return el;
  }

  async function api(path, method = 'GET', body) {
    const opts = { method, credentials: 'same-origin' };
    if (body) {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
    const response = await fetch('/manage/api' + path, opts);
    const data = await response.json();
    if (!response.ok) throw new Error(data.code || 'REQUEST_FAILED');
    return data;
  }

  function showLogin(message = '') {
    $('dashboard').hidden = true;
    $('sign-in').hidden = false;
    $('login-message').textContent = message;
  }

  function showDashboard(account) {
    $('sign-in').hidden = true;
    $('dashboard').hidden = false;
    $('signed-in').textContent = account.username;
    navigate('overview');
  }

  function navigate(view) {
    current = view;
    status = Object.keys(filters[view] || {})[0] || '';
    page = 1;
    load();
  }

  function renderOverview(data) {
    const metrics = element('div', undefined, 'metrics');
    for (const [key, label] of [
      ['users', '已登录用户'], ['newUsers', '近 7 天新增'], ['feedback', '待处理反馈'],
      ['corrections', '待核对照片'], ['published', '已替换图鉴照片'],
      ['syncedGardens', '云端田地'], ['syncedRecords', '云端养护记录'],
    ]) {
      const tile = element('div', undefined, 'metric');
      tile.append(element('span', label), element('strong', String(data[key] ?? 0)));
      metrics.append(tile);
    }
    root.append(metrics, element('p', '田地和日记目前主要保存在用户设备上，这里显示已同步到服务器的记录。', 'hint'));
  }

  function renderUsers(data) {
    const table = element('table');
    const heading = table.createTHead().insertRow();
    for (const label of ['用户编号', '注册时间', '最近会话', '云端田地', '云端养护记录']) {
      heading.append(element('th', label));
    }
    const tbody = table.createTBody();
    for (const user of data.items) {
      const row = tbody.insertRow();
      for (const item of [user.userRef, user.createdAt, user.lastLogin, user.gardens, user.records]) {
        row.append(element('td', String(item ?? '—')));
      }
    }
    const wrap = element('div', undefined, 'table-wrap');
    wrap.append(table);
    root.append(wrap);
    if (!data.items.length) root.append(element('p', '暂无已登录用户', 'empty'));
    const actions = element('div', undefined, 'actions');
    const previous = button('上一页', () => { page--; load(); });
    const next = button('下一页', () => { page++; load(); });
    previous.disabled = page <= 1;
    next.disabled = !data.hasMore;
    actions.append(previous, element('span', '第 ' + page + ' 页'), next);
    root.append(actions);
  }

  async function update(path, data, control) {
    $('notice').textContent = '';
    control.disabled = true;
    try {
      await api(path, 'PATCH', data);
      await load();
    } catch (error) {
      $('notice').textContent = error.message === 'CORRECTION_CONFLICT'
        ? '记录已更新或植物分类已变更，请刷新后复核。' : '操作失败，请重试。';
      control.disabled = false;
    }
  }

  function renderFeedback(item, card) {
    const category = { suggestion: '功能建议', bug: '问题反馈', content: '内容纠错', other: '其他' }[item.category] || '用户反馈';
    card.append(element('h2', category), element('time', item.createdAt), element('p', item.content));
    if (item.contact) card.append(element('p', '联系方式 ' + item.contact, 'meta'));
    const actions = element('div', undefined, 'actions');
    for (const [key, label] of [['open', '重开'], ['reviewing', '开始处理'], ['closed', '标记完成']]) {
      if (key !== item.status) actions.append(button(label, event => update('/feedback/' + item.id, { status: key }, event.currentTarget)));
    }
    card.append(actions);
  }

  function renderCorrection(item, card) {
    const path = '/corrections/' + item.id;
    card.append(element('h2', item.plantName), element('p', item.scientificName || '', 'meta'),
      element('time', item.createdAt));
    if (item.note) card.append(element('p', item.note));
    if (item.active) card.append(element('p', '当前图鉴所用照片', 'meta'));
    const actions = element('div', undefined, 'actions');
    const preview = element('div');
    preview.hidden = true;
    actions.append(button('查看候选照片', event => {
      if (preview.hidden && !preview.hasChildNodes()) {
        const photo = element('img', undefined, 'preview');
        photo.alt = item.plantName + '候选照片';
        photo.src = '/manage/api' + path;
        preview.append(photo);
        if (item.status !== 'rejected' && !item.active) {
          const checks = element('div', undefined, 'preview-checks');
          const confirm = button('确认并替换图鉴照片', e => update(path, {
            action: 'publish', taxonChecked: taxon.checked, rightsChecked: rights.checked,
          }, e.currentTarget), 'primary');
          confirm.disabled = true;
          let decoded = false;
          function canPublish() { confirm.disabled = !decoded || !taxon.checked || !rights.checked; }
          function check(text) {
            const field = element('input');
            const label = element('label');
            field.type = 'checkbox';
            field.addEventListener('change', canPublish);
            label.append(field, document.createTextNode(text));
            checks.append(label);
            return field;
          }
          const taxon = check('已核对照片中的物种和图鉴条目');
          const rights = check('已核对照片有权用于图鉴');
          photo.addEventListener('load', () => { decoded = true; canPublish(); });
          photo.addEventListener('error', () => { $('notice').textContent = '候选照片加载失败，请重新打开再试。'; });
          preview.append(checks, confirm);
        }
      }
      preview.hidden = !preview.hidden;
      event.currentTarget.textContent = preview.hidden ? '查看候选照片' : '收起照片';
    }));
    if (item.status === 'pending') actions.append(button('不采纳', event => update(path, { action: 'reject' }, event.currentTarget)));
    card.append(actions, preview);
  }

  function renderQueue(data) {
    const bar = element('div', undefined, 'filters');
    for (const [key, label] of Object.entries(filters[current])) {
      const tab = button(label, () => { status = key; load(); });
      tab.setAttribute('aria-pressed', String(key === status));
      bar.append(tab);
    }
    root.append(bar);
    if (!data.items.length) {
      root.append(element('p', '这个状态下暂无记录', 'empty'));
      return;
    }
    const cards = element('div', undefined, 'cards');
    for (const item of data.items) {
      const card = element('article', undefined, 'card');
      if (current === 'feedback') renderFeedback(item, card);
      else renderCorrection(item, card);
      cards.append(card);
    }
    root.append(cards);
  }

  async function load() {
    const id = ++pending;
    $('view-title').textContent = labels[current];
    for (const tab of document.querySelectorAll('nav button')) {
      if (tab.dataset.view === current) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    }
    $('notice').textContent = '';
    root.replaceChildren(element('p', '加载中…', 'hint'));
    const query = current === 'users' ? '?page=' + page : status ? '?status=' + status : '';
    try {
      const data = await api('/' + current + query);
      if (id !== pending) return;
      root.replaceChildren();
      if (current === 'overview') renderOverview(data);
      else if (current === 'users') renderUsers(data);
      else renderQueue(data);
    } catch (error) {
      if (id !== pending) return;
      if (error.message === 'LOGIN_REQUIRED') showLogin('登录已过期，请重新登录。');
      else root.replaceChildren(element('p', '数据暂时无法读取。', 'error'), button('重试', load));
    }
  }

  for (const tab of document.querySelectorAll('nav button')) tab.addEventListener('click', () => navigate(tab.dataset.view));
  $('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button');
    submit.disabled = true;
    $('login-message').textContent = '';
    try {
      const data = Object.fromEntries(new FormData(form));
      const account = await api('/session', 'POST', { username: data.username.trim(), password: data.password });
      form.reset();
      showDashboard(account);
    } catch (error) {
      $('login-message').textContent = error.message === 'RATE_LIMIT' ? '尝试次数过多，请稍后再试。' : '登录失败，请检查账号和密码后重试。';
    } finally {
      submit.disabled = false;
    }
  });
  $('sign-out').addEventListener('click', async () => {
    try { await api('/session', 'DELETE'); showLogin(); }
    catch (error) {
      if (error.message === 'LOGIN_REQUIRED') showLogin();
      else $('notice').textContent = '退出失败，请重试。';
    }
  });
  api('/session').then(showDashboard).catch(() => showLogin());
})();`;
