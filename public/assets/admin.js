let token = '';

async function api(path, options={}){
  options.headers = Object.assign({}, options.headers||{}, { 'Authorization': `Bearer ${token}` });
  const res = await fetch(path, options);
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}

function showToast(text){
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(()=>{ el.remove(); }, 2200);
}

function confirmModal(message){
  return new Promise((resolve)=>{
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `<div>${message}</div>`;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const cancel = document.createElement('button');
    cancel.className = 'btn secondary';
    cancel.textContent = 'Отмена';
    const ok = document.createElement('button');
    ok.className = 'btn';
    ok.textContent = 'Подтвердить';
    actions.appendChild(cancel);
    actions.appendChild(ok);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    cancel.addEventListener('click', ()=>{ backdrop.remove(); resolve(false); });
    ok.addEventListener('click', ()=>{ backdrop.remove(); resolve(true); });
  });
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
      const ok = await confirmModal('Удалить заявку?');
      if(!ok) return;
      await api(`/api/admin/exchanges/${e.id}`, { method:'DELETE' });
      await loadExchanges();
      showToast('Удалено');
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
    localStorage.setItem('admin_token', token);
    try{
      await loadWallets();
      await loadExchanges();
      await refreshTg();
      showToast('Авторизовано');
    }catch(err){
      showToast('Ошибка авторизации');
    }
  });

  document.getElementById('wallet-form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const currency = document.getElementById('w-currency').value.trim();
    const network = document.getElementById('w-network').value.trim();
    const address = document.getElementById('w-address').value.trim();
    await api('/api/admin/wallets', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ currency, network, address })});
    await loadWallets();
    showToast('Сохранено');
  });

  // telegram executor settings
  const refreshTg = async ()=>{
    try{
      const s = await api('/api/admin/settings');
      document.getElementById('tg-current').textContent = s.telegram_executor ? `Текущий: @${s.telegram_executor}` : 'Не задан';
    }catch{}
  };
  document.getElementById('tg-form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const username = document.getElementById('tg-username').value.trim();
    try{
      await api('/api/admin/settings/telegram', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username }) });
      await refreshTg();
      showToast('Telegram обновлён');
    }catch(err){
      showToast('Ошибка сохранения Telegram');
    }
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
        const ok = await confirmModal('Удалить заявку?');
        if(!ok) return;
        await api(`/api/admin/exchanges/${e.id}`, { method:'DELETE' });
        await loadExchanges();
        showToast('Удалено');
      });
      box.appendChild(div);
      box.appendChild(delBtn);
    }
  });

  // авто-авторизация по сохранённому токену
  const saved = localStorage.getItem('admin_token');
  if(saved){
    token = saved;
    document.getElementById('admin-token').value = saved;
    try{
      await loadWallets();
      await loadExchanges();
      await refreshTg();
    }catch{}
  }
});


