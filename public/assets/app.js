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
  result.innerHTML = `Комиссия сервиса: <b>10%</b><br>Номер заявки: <span class="highlight">${exchangeId}</span><br>Адрес для перевода: <span class="highlight">${data.walletAddress}</span>${data.note ? '<br>'+data.note : ''}`;
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

const i18n = {
  ru: {
    title: 'CRYPTO EXCHANGER 2.0',
    subtitle: 'ретро web2 стиль • без регистрации',
    create: 'Создать обмен',
    crypto: 'Криптовалюта',
    network: 'Сеть',
    get: 'Получить',
    cash: 'Наличные по РФ',
    amountLabel: 'Сумма, $ (лимиты: 10–10 000; для наличных минимум 100)',
    submit: 'Обменять',
    tgTitle: 'Связь в Telegram',
    cashWarn: 'Важно: при выборе наличных комиссия выше, т.к. деньги отправляются доверенному лицу для личной передачи. Работаем локально и безопасно, без посредников.',
    footer: '© 2000–2025 CryptoExchanger'
  },
  en: {
    title: 'CRYPTO EXCHANGER 2.0',
    subtitle: 'retro web2 style • no registration',
    create: 'Create exchange',
    crypto: 'Cryptocurrency',
    network: 'Network',
    get: 'Receive',
    cash: 'Cash in Russia',
    amountLabel: 'Amount, $ (limits: 10–10,000; for cash min 100)',
    submit: 'Exchange',
    tgTitle: 'Telegram Contact',
    cashWarn: 'Important: cash has higher commission due to logistics. We operate locally and safely, no intermediaries.',
    footer: '© 2000–2025 CryptoExchanger'
  }
};

function applyLang(lang){
  const t = i18n[lang] || i18n.ru;
  document.getElementById('t-title').textContent = t.title;
  document.getElementById('t-subtitle').textContent = t.subtitle;
  document.getElementById('t-create').textContent = t.create;
  document.getElementById('t-crypto').textContent = t.crypto;
  document.getElementById('t-network').textContent = t.network;
  document.getElementById('t-get').textContent = t.get;
  document.getElementById('t-cash').textContent = t.cash;
  document.getElementById('t-amountLabel').textContent = t.amountLabel;
  document.getElementById('t-submit').textContent = t.submit;
  document.getElementById('t-tg-title').textContent = t.tgTitle;
  document.getElementById('cash-warning').textContent = t.cashWarn;
  document.getElementById('t-footer').textContent = t.footer;
  localStorage.setItem('lang', lang);
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
  const saved = localStorage.getItem('lang') || 'ru';
  applyLang(saved);
  document.getElementById('lang-ru').addEventListener('click', ()=>applyLang('ru'));
  document.getElementById('lang-en').addEventListener('click', ()=>applyLang('en'));
  document.getElementById('toType').addEventListener('change', showCashWarning);
  showCashWarning();
  document.getElementById('exchange-form').addEventListener('submit', createExchange);
  // чат удалён
});


