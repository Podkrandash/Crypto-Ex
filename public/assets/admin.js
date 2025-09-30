let token = '';

async function api(path, options={}){
  options.headers = Object.assign({}, options.headers||{}, { 'Authorization': `Bearer ${token}` });
  const res = await fetch(path, options);
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadWallets(){
  const list = await api('/api/admin/wallets');
  const box = document.getElementById('wallets');
  box.innerHTML = '';
  for(const w of list){
    const div = document.createElement('div');
    div.textContent = `${w.currency} ${w.network}: ${w.address}`;
    box.appendChild(div);
  }
}

async function loadExchanges(){
  const list = await api('/api/admin/exchanges');
  const box = document.getElementById('exchanges');
  box.innerHTML = '';
  for(const e of list){
    const div = document.createElement('div');
    div.className = 'result';
    const info = document.createElement('div');
    info.innerHTML = `#${e.id}<br>${e.fromCurrency} ${e.network} → ${e.toType} • $${e.amountUsd} • ${e.status} • ${new Date(e.createdAt).toLocaleString()}`;
    const actionRow = document.createElement('div');
    actionRow.className = 'form-row';
    const delBtn = document.createElement('button');
    delBtn.className = 'btn';
    delBtn.textContent = 'Удалить';
    delBtn.addEventListener('click', async ()=>{
      if(!confirm('Удалить заявку?')) return;
      await api(`/api/admin/exchanges/${e.id}`, { method:'DELETE' });
      await loadExchanges();
    });
    actionRow.appendChild(delBtn);
    div.appendChild(info);
    div.appendChild(actionRow);
    box.appendChild(div);
  }
}

// чат удалён

document.addEventListener('DOMContentLoaded', async ()=>{
  document.getElementById('auth-form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    token = document.getElementById('admin-token').value.trim();
    try{
      await loadWallets();
      await loadExchanges();
      alert('OK');
    }catch(err){
      alert('Ошибка авторизации или сети');
    }
  });

  document.getElementById('wallet-form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const currency = document.getElementById('w-currency').value.trim();
    const network = document.getElementById('w-network').value.trim();
    const address = document.getElementById('w-address').value.trim();
    await api('/api/admin/wallets', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ currency, network, address })});
    await loadWallets();
    alert('Сохранено');
  });

  // telegram executor settings
  const refreshTg = async ()=>{
    try{
      const s = await api('/api/admin/settings');
      document.getElementById('tg-current').textContent = s.telegram_executor ? `Текущий: @${s.telegram_executor}` : 'Не задан';
    }catch{}
  };
  await refreshTg();
  document.getElementById('tg-form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const username = document.getElementById('tg-username').value.trim();
    await api('/api/admin/settings/telegram', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username }) });
    await refreshTg();
    alert('Сохранено');
  });

  // поиск
  const searchForm = document.createElement('form');
  searchForm.className = 'form-row';
  const searchInput = document.createElement('input');
  searchInput.placeholder = 'Поиск по номеру заявки';
  const searchBtn = document.createElement('button');
  searchBtn.className = 'btn';
  searchBtn.type = 'submit';
  searchBtn.textContent = 'Искать';
  searchForm.appendChild(searchInput);
  searchForm.appendChild(searchBtn);
  document.getElementById('exchanges').before(searchForm);
  searchForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const q = searchInput.value.trim();
    const list = await api('/api/admin/exchanges' + (q ? (`?search=${encodeURIComponent(q)}`) : ''));
    const box = document.getElementById('exchanges');
    box.innerHTML = '';
    for(const e of list){
      const div = document.createElement('div');
      div.className = 'result';
      div.innerHTML = `#${e.id}<br>${e.fromCurrency} ${e.network} → ${e.toType} • $${e.amountUsd} • ${e.status} • ${new Date(e.createdAt).toLocaleString()}`;
      const delBtn = document.createElement('button');
      delBtn.className = 'btn';
      delBtn.textContent = 'Удалить';
      delBtn.addEventListener('click', async ()=>{
        if(!confirm('Удалить заявку?')) return;
        await api(`/api/admin/exchanges/${e.id}`, { method:'DELETE' });
        await loadExchanges();
      });
      box.appendChild(div);
      box.appendChild(delBtn);
    }
  });
});


