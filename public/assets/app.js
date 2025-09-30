let authData = { userId: null, username: null };
let exchangeId = null;
// чат убран

async function bootstrap(){
  const res = await fetch('/api/bootstrap');
  authData = await res.json();
}

function showCashWarning(){
  const sel = document.getElementById('toType');
  const warn = document.getElementById('cash-warning');
  if(sel.value === 'CASH_RU') warn.hidden = false; else warn.hidden = true;
}

async function createExchange(ev){
  ev.preventDefault();
  const fromCurrency = document.getElementById('fromCurrency').value;
  const network = document.getElementById('network').value;
  const toType = document.getElementById('toType').value;
  const amountUsd = Number(document.getElementById('amountUsd').value);

  const resp = await fetch('/api/exchange',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ fromCurrency, network, toType, amountUsd })
  });
  const data = await resp.json();
  const result = document.getElementById('result');
  if(!resp.ok){
    result.hidden = false; result.textContent = data.error || 'Ошибка';
    return;
  }
  exchangeId = data.exchangeId;
  result.hidden = false;
  result.innerHTML = `Адрес для перевода: <b>${data.walletAddress}</b>${data.note ? '<br>'+data.note : ''}`;
  showTelegram(data.telegram);
}

function appendMessage(listEl, text, sender){
  const div = document.createElement('div');
  div.textContent = `${sender === 'admin' ? '[Админ]': '[Вы]'} ${text}`;
  listEl.appendChild(div);
  listEl.scrollTop = listEl.scrollHeight;
}

function showTelegram(tg){
  const sec = document.getElementById('tg-info');
  const box = document.getElementById('tg-box');
  sec.hidden = false;
  box.innerHTML = `Ваш номер заявки: <b>${exchangeId}</b><br>Напишите в Telegram исполнителю: <b>@${tg}</b> и укажите номер заявки.`;
}

document.addEventListener('DOMContentLoaded', async ()=>{
  await bootstrap();
  try{
    if(window?.Telegram?.WebApp){
      const tg = window.Telegram.WebApp;
      tg.expand(); // просим телеграм развернуть мини-апп на максимум
      tg.disableVerticalSwipes?.(); // пытаемся отключить жест сворачивания, если доступно
    }
  }catch(e){}
  document.getElementById('toType').addEventListener('change', showCashWarning);
  showCashWarning();
  document.getElementById('exchange-form').addEventListener('submit', createExchange);
  // чат удалён
});


