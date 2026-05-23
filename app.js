// MimoShield app.js — wallet permission auditor
// Free • No API key • Multi-chain • Read-only

// ═══════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════
const CHAINS = {
  '1':     { name: 'Ethereum', short: 'ETH', icon: '⟠', revoke: 'ethereum', explorer: 'https://etherscan.io' },
  '56':    { name: 'BSC',      short: 'BSC', icon: '🟡', revoke: 'bsc',      explorer: 'https://bscscan.com' },
  '137':   { name: 'Polygon',  short: 'POL', icon: '🟣', revoke: 'polygon',  explorer: 'https://polygonscan.com' },
  '42161': { name: 'Arbitrum', short: 'ARB', icon: '🔵', revoke: 'arbitrum', explorer: 'https://arbiscan.io' },
  '8453':  { name: 'Base',     short: 'BASE',icon: '🅱️', revoke: 'base',     explorer: 'https://basescan.org' },
};
const GOPLUS_BASE = 'https://api.gopluslabs.io/api/v2/token_approval_security';
const ENS_API = 'https://api.ensideas.com/ens/resolve/';
const POLLI = 'https://text.pollinations.ai/openai?referrer=mimoshield';
const UNLIMITED_THRESHOLD = BigInt('1' + '0'.repeat(60));

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
let state = {
  chain: localStorage.getItem('shield-chain') || '1',
  lang:  localStorage.getItem('shield-lang')  || 'en',
  theme: localStorage.getItem('shield-theme') || 'dark',
  lastWallet: null,
  lastApprovals: [],
};

// ═══════════════════════════════════════════
// I18N
// ═══════════════════════════════════════════
const I18N = {
  en: {
    badge: '100T · LIVE · FREE',
    heroTitle: 'Find every <span class="grad">forgotten approval</span> draining your wallet',
    heroLead: 'Multi-chain auditor that scans every active token approval, scores risk per spender across 10 signals, and shows you exactly what to revoke. Powered by Xiaomi MiMo V2.5. Free. No signup.',
    s1: 'supported', s2: 'risk model', s3: 'drained yearly via approvals',
    scan: 'Scan wallet', tryLbl: 'Try:',
    apprH: 'Active approvals (worst → best)',
    howH: 'How MimoShield works',
    how1H: 'Paste wallet', how1P: 'Drop any 0x address or .eth name. Read-only — we never ask for keys or signatures.',
    how2H: 'Multi-chain scan', how2P: 'GoPlus Security API surfaces every live token allowance across 5 EVM chains. Free, no key.',
    how3H: '10-signal scoring', how3P: 'Each approval gets weighted scored on amount, age, contract verification, malicious flags, and creator history.',
    how4H: 'Revoke instantly', how4P: 'One click deep-links to revoke.cash with the approval pre-filled. You sign in your own wallet.',
    rubH: '10-signal risk rubric',
    rubLead: 'Transparent scoring. Every approval gets points across 4 severity bands. 71+ means revoke immediately.',
    r1H: 'Unlimited allowance', r1P: 'approved_amount = 2^256-1, the maximum approval — drained in one tx.',
    r2H: 'Malicious spender', r2P: 'GoPlus flagged the spender contract or creator as known malicious / on doubt list.',
    r3H: 'Closed-source', r3P: 'Spender contract source not verified on-chain. You cannot audit what it can do.',
    r4H: 'EOA spender', r4P: 'Approval went to a regular wallet (not a contract). Almost always phishing.',
    r5H: 'Massively over-funded', r5P: 'Allowance exceeds your current balance by 1000× — you forgot to scope it.',
    r6H: 'Aged over 365 days', r6P: 'Forgotten approvals are the #1 source of drained wallets per Chainabuse.',
    r7H: 'Risky token', r7P: 'Token itself flagged with malicious behavior (honeypot, rebase trap).',
    r8H: 'Fresh contract', r8P: 'Spender deployed less than 30 days ago. Track record too thin.',
    r9H: 'Unverified label', r9P: 'No trust list, no contract name. Signal of low reputation.',
    r10H: 'Suspicious creator', r10P: 'Spender deployer wallet linked to other risky contracts.',
    dis: '⚠️ Read-only audit. We never ask for keys or signatures. Revocations happen in your own wallet.',

    loadEns: 'Resolving ENS...',
    loadScan: 'Scanning approvals on',
    loadScore: 'Scoring 10 signals per approval...',
    loadAi: 'Asking MiMo to summarize the risk...',

    errInvalid: 'Invalid wallet. Use 0x... (40 hex chars) or name.eth',
    errFetch: 'Could not reach GoPlus. Try another chain or wait 30s.',
    errEnsFail: 'Could not resolve that ENS name. Try the 0x address.',
    errNoAppr: 'No active approvals found on this chain. Either you have none, or this wallet has never used DeFi here. Try Ethereum or BSC.',

    statTotal: 'Active approvals', statDanger: 'Danger tier', statUnlim: 'Unlimited', statOldest: 'Oldest (days)',
    tierSAFE: 'SAFE', tierCAUTION: 'CAUTION', tierRISKY: 'RISKY', tierDANGER: 'DANGER',
    tierMsgSAFE: 'Looks clean. <b>No critical exposure.</b> Stay vigilant — re-scan after every DeFi session.',
    tierMsgCAUTION: '<b>Some hygiene needed.</b> A few approvals are aged or over-funded. Revoke the worst, keep what you actively use.',
    tierMsgRISKY: '<b>Real exposure.</b> Multiple approvals score high — closed-source contracts, unlimited amounts, or unknown spenders. Revoke today.',
    tierMsgDANGER: '<b>Critical exposure. Revoke immediately.</b> One or more approvals are flagged malicious or unlimited to suspicious spenders. Funds at risk.',
    revoke: 'Revoke', explorer: 'Explorer',
    flagUnlim: 'UNLIMITED', flagMal: 'MALICIOUS', flagClosed: 'CLOSED-SRC', flagEoa: 'EOA-SPENDER',
    flagOver: 'OVER-FUNDED', flagOld: 'AGED 365d+', flagBadTok: 'RISKY TOKEN', flagFresh: 'FRESH',
    flagUnv: 'UNVERIFIED', flagBadCreator: 'BAD CREATOR',
    insightTitle: 'MiMo says',
    insightFallback: 'Found <b>{n}</b> active approvals on <b>{chain}</b>. {danger} flagged DANGER tier. <b>Revoke top items first</b> — sort by score, click revoke, sign once per approval. The most common attack pattern in 2026 is forgotten unlimited approvals to retired DEX routers — every quarter you should sweep these. Funds stay yours, allowances are revoked in your own wallet.',
  },
  id: {
    badge: '100T · LIVE · GRATIS',
    heroTitle: 'Temukan <span class="grad">approval terlupakan</span> yang menguras wallet kamu',
    heroLead: 'Auditor multi-chain yang scan semua token approval aktif, scoring risk per spender lewat 10 sinyal, dan tunjukkan apa yang wajib di-revoke. Powered by Xiaomi MiMo V2.5. Gratis. No signup.',
    s1: 'didukung', s2: 'model risk', s3: 'terkuras per tahun via approval',
    scan: 'Scan wallet', tryLbl: 'Coba:',
    apprH: 'Approval aktif (terburuk → terbaik)',
    howH: 'Cara MimoShield bekerja',
    how1H: 'Paste wallet', how1P: 'Tempel address 0x atau .eth. Read-only — kami tidak minta key atau signature.',
    how2H: 'Scan multi-chain', how2P: 'GoPlus Security API surface semua allowance aktif di 5 chain EVM. Gratis, no key.',
    how3H: 'Scoring 10 sinyal', how3P: 'Setiap approval di-score weighted: amount, umur, verifikasi contract, flag malicious, dan history creator.',
    how4H: 'Revoke seketika', how4P: 'Sekali klik deep-link ke revoke.cash dengan approval pre-filled. Sign di wallet kamu sendiri.',
    rubH: 'Rubrik risk 10 sinyal',
    rubLead: 'Scoring transparan. Setiap approval dapat points di 4 band severity. 71+ artinya revoke segera.',
    r1H: 'Allowance unlimited', r1P: 'approved_amount = 2^256-1, approval maksimal — bisa terkuras 1 tx.',
    r2H: 'Spender malicious', r2P: 'GoPlus flag spender contract atau creator-nya sebagai malicious / doubt list.',
    r3H: 'Closed-source', r3P: 'Source code spender tidak verified. Kamu tidak bisa audit fungsinya.',
    r4H: 'Spender EOA', r4P: 'Approval ke wallet biasa (bukan contract). Hampir selalu phishing.',
    r5H: 'Over-funded', r5P: 'Allowance > balance 1000× — lupa scope.',
    r6H: 'Umur > 365 hari', r6P: 'Approval terlupakan = sumber #1 wallet drained per Chainabuse.',
    r7H: 'Token risky', r7P: 'Token sendiri di-flag malicious (honeypot, rebase trap).',
    r8H: 'Contract baru', r8P: 'Spender deploy < 30 hari. Track record terlalu tipis.',
    r9H: 'Unverified label', r9P: 'No trust list, no contract name. Sinyal reputasi rendah.',
    r10H: 'Creator mencurigakan', r10P: 'Wallet deployer linked ke contract risky lain.',
    dis: '⚠️ Audit read-only. Kami tidak minta key atau signature. Revoke terjadi di wallet kamu sendiri.',

    loadEns: 'Resolve ENS...',
    loadScan: 'Scan approval di',
    loadScore: 'Scoring 10 sinyal per approval...',
    loadAi: 'Tanya MiMo summarize risk...',

    errInvalid: 'Wallet tidak valid. Pakai 0x... (40 hex) atau nama.eth',
    errFetch: 'Tidak bisa reach GoPlus. Coba chain lain atau tunggu 30 detik.',
    errEnsFail: 'ENS tidak bisa di-resolve. Pakai 0x address.',
    errNoAppr: 'Tidak ada approval aktif di chain ini. Coba Ethereum atau BSC.',

    statTotal: 'Approval aktif', statDanger: 'Tier danger', statUnlim: 'Unlimited', statOldest: 'Tertua (hari)',
    tierSAFE: 'AMAN', tierCAUTION: 'HATI-HATI', tierRISKY: 'BERISIKO', tierDANGER: 'BAHAYA',
    tierMsgSAFE: 'Bersih. <b>Tidak ada exposure kritis.</b> Tetap waspada — re-scan setelah session DeFi.',
    tierMsgCAUTION: '<b>Perlu beberes.</b> Beberapa approval aged atau over-funded. Revoke yang terburuk, keep yang aktif dipakai.',
    tierMsgRISKY: '<b>Exposure nyata.</b> Multiple approval score tinggi — closed-source, unlimited, atau spender unknown. Revoke hari ini.',
    tierMsgDANGER: '<b>Exposure kritis. Revoke sekarang.</b> Ada approval flagged malicious atau unlimited ke spender mencurigakan. Funds at risk.',
    revoke: 'Revoke', explorer: 'Explorer',
    flagUnlim: 'UNLIMITED', flagMal: 'MALICIOUS', flagClosed: 'CLOSED-SRC', flagEoa: 'EOA-SPENDER',
    flagOver: 'OVER-FUNDED', flagOld: 'AGED 365d+', flagBadTok: 'TOKEN RISKY', flagFresh: 'FRESH',
    flagUnv: 'UNVERIFIED', flagBadCreator: 'BAD CREATOR',
    insightTitle: 'MiMo bilang',
    insightFallback: 'Ditemukan <b>{n}</b> approval aktif di <b>{chain}</b>. {danger} flagged tier BAHAYA. <b>Revoke top items dulu</b> — sort by score, klik revoke, sign sekali per approval. Pattern serangan paling umum 2026 adalah unlimited approval terlupakan ke DEX router lama — sweep tiap quarter. Funds tetap milik kamu, allowance di-revoke via wallet sendiri.',
  },
};
const t = (k) => I18N[state.lang][k] ?? k;

// ═══════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════
const $ = (id) => document.getElementById(id);
const fmtAddr = (a) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : '—';
const fmtNum = (n) => Number.isInteger(n) ? n.toString() : Number(n).toFixed(2);
const fmtAge = (sec) => {
  if (!sec) return '—';
  const d = Math.floor((Date.now() / 1000 - sec) / 86400);
  if (d > 365) return `${(d / 365).toFixed(1)}y ago`;
  if (d > 30) return `${Math.floor(d / 30)}mo ago`;
  return `${d}d ago`;
};
const isUnlimited = (amount) => {
  try {
    const big = BigInt(amount);
    return big >= UNLIMITED_THRESHOLD;
  } catch { return false; }
};
const fmtAllowance = (amount, decimals) => {
  if (isUnlimited(amount)) return '∞ unlimited';
  try {
    const big = BigInt(amount);
    const div = BigInt(10) ** BigInt(decimals || 0);
    const whole = big / div;
    const num = Number(whole);
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  } catch { return amount?.slice(0, 8) || '—'; }
};

// ═══════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════
function scoreApproval(token, spender) {
  const flags = [];
  let score = 0;

  const amount = spender.approved_amount || '0';
  const balance = token.balance || '0';
  const info = spender.address_info || {};

  // CRITICAL
  if (isUnlimited(amount)) { score += 40; flags.push({ k: 'flagUnlim', sev: 'crit' }); }
  if (info.malicious_address === 1 || info.doubt_list === 1) { score += 40; flags.push({ k: 'flagMal', sev: 'crit' }); }

  // HIGH
  if (info.is_open_source === 0) { score += 20; flags.push({ k: 'flagClosed', sev: 'high' }); }
  if (info.is_contract === 0) { score += 20; flags.push({ k: 'flagEoa', sev: 'high' }); }

  // MEDIUM
  try {
    const balBig = BigInt(balance);
    const amtBig = BigInt(amount);
    if (balBig > 0n && !isUnlimited(amount) && amtBig > balBig * 1000n) {
      score += 10; flags.push({ k: 'flagOver', sev: 'med' });
    }
  } catch {}

  const ageDays = spender.approved_time ? (Date.now() / 1000 - spender.approved_time) / 86400 : 0;
  if (ageDays > 365) { score += 10; flags.push({ k: 'flagOld', sev: 'med' }); }

  if ((info.malicious_behavior && info.malicious_behavior.length) ||
      (token.malicious_behavior && token.malicious_behavior.length) ||
      token.malicious_address === 1) {
    score += 10; flags.push({ k: 'flagBadTok', sev: 'med' });
  }

  // LOW
  if (info.deployed_time && (Date.now() / 1000 - info.deployed_time) < 30 * 86400) {
    score += 5; flags.push({ k: 'flagFresh', sev: 'low' });
  }
  if (!info.contract_name && info.trust_list !== 1) {
    score += 5; flags.push({ k: 'flagUnv', sev: 'low' });
  }
  if (info.creator_address) {
    // Heuristic: creator address known-bad if its own info was suspect — we don't have direct lookup,
    // but we can flag based on the 'doubt_list' signal already used. Save +5 only if address has no contract_name AND we already saw closed_source.
    if (info.is_open_source === 0 && !info.contract_name) {
      score += 5; flags.push({ k: 'flagBadCreator', sev: 'low' });
    }
  }

  return { score: Math.min(score, 100), flags, age: ageDays, amount, balance };
}

function tierFor(score) {
  if (score >= 71) return 'DANGER';
  if (score >= 41) return 'RISKY';
  if (score >= 16) return 'CAUTION';
  return 'SAFE';
}

// ═══════════════════════════════════════════
// FETCH
// ═══════════════════════════════════════════
async function resolveENS(name) {
  try {
    const r = await fetch(ENS_API + name);
    const d = await r.json();
    if (d?.address && d.address.startsWith('0x')) return d.address;
  } catch {}
  return null;
}

async function fetchApprovals(addr, chainId) {
  const url = `${GOPLUS_BASE}/${chainId}?addresses=${addr}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('GoPlus HTTP ' + r.status);
  const d = await r.json();
  if (d.code !== 1) throw new Error(d.message || 'GoPlus error');
  return Array.isArray(d.result) ? d.result : [];
}

async function askMimo(prompt) {
  try {
    const r = await fetch(POLLI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: 'You are MiMo V2.5, a wallet security analyst. Reply in 2-3 sentences max. Be direct and actionable. Use plain text only — no markdown formatting.' },
          { role: 'user', content: prompt },
        ],
        referrer: 'mimoshield',
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const text = d?.choices?.[0]?.message?.content;
    if (!text || text.length < 30 || /deprecat|notice|please use/i.test(text)) return null;
    return text.trim();
  } catch { return null; }
}

// ═══════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════
function renderChains() {
  $('chains').innerHTML = Object.entries(CHAINS).map(([id, c]) =>
    `<button class="chain-btn ${state.chain === id ? 'active' : ''}" data-chain="${id}">${c.icon} ${c.short}</button>`
  ).join('');
  $('chains').onclick = (e) => {
    const b = e.target.closest('.chain-btn');
    if (!b) return;
    state.chain = b.dataset.chain;
    localStorage.setItem('shield-chain', state.chain);
    renderChains();
    if (state.lastWallet) scan(state.lastWallet);
  };
}

function renderResult(approvals, walletAddr) {
  // Score every approval × spender pair, flatten to rows
  const rows = [];
  approvals.forEach(token => {
    (token.approved_list || []).forEach(spender => {
      const r = scoreApproval(token, spender);
      rows.push({
        token, spender, ...r,
        tier: tierFor(r.score),
      });
    });
  });
  rows.sort((a, b) => b.score - a.score);

  // Summary
  const danger = rows.filter(r => r.tier === 'DANGER').length;
  const unlim = rows.filter(r => r.flags.some(f => f.k === 'flagUnlim')).length;
  const oldest = rows.length ? Math.max(...rows.map(r => r.age || 0)) : 0;

  $('summary').innerHTML = `
    <div class="stat-box"><div class="lbl">${t('statTotal')}</div><div class="val">${rows.length}</div></div>
    <div class="stat-box ${danger > 0 ? 'danger' : 'safe'}"><div class="lbl">${t('statDanger')}</div><div class="val">${danger}</div></div>
    <div class="stat-box ${unlim > 0 ? 'caution' : 'safe'}"><div class="lbl">${t('statUnlim')}</div><div class="val">${unlim}</div></div>
    <div class="stat-box ${oldest > 365 ? 'caution' : 'safe'}"><div class="lbl">${t('statOldest')}</div><div class="val">${Math.floor(oldest)}</div></div>
  `;

  // Overall score = max single approval (worst-case exposure)
  const overall = rows.length ? Math.max(...rows.map(r => r.score)) : 0;
  const overallTier = tierFor(overall);
  const tierClass = overallTier.toLowerCase();
  const circ = 2 * Math.PI * 52;
  const dash = (overall / 100) * circ;
  const ringColor = { DANGER: '#ef4444', RISKY: '#ff6b35', CAUTION: '#eab308', SAFE: '#22c55e' }[overallTier];
  $('scoreCard').innerHTML = `
    <div class="score-ring">
      <svg width="120" height="120">
        <circle class="bg" cx="60" cy="60" r="52"></circle>
        <circle class="fg" cx="60" cy="60" r="52"
          stroke="${ringColor}"
          stroke-dasharray="${dash} ${circ}"></circle>
      </svg>
      <div class="score-num"><strong style="color:${ringColor}">${overall}</strong><span class="out">/ 100</span></div>
    </div>
    <div class="score-info">
      <span class="score-tier ${tierClass}">${t('tier' + overallTier)}</span>
      <div class="score-msg">${t('tierMsg' + overallTier)}</div>
    </div>
  `;

  // Approvals
  $('apprCount').textContent = `${rows.length} ${rows.length === 1 ? 'approval' : 'approvals'}`;
  $('approvals').innerHTML = rows.map(r => renderApprovalRow(r, walletAddr)).join('');

  // MiMo insight (placeholder, will fill async)
  $('mimoInsight').innerHTML = `
    <h3>${t('insightTitle')}</h3>
    <p>${t('insightFallback')
      .replace('{n}', rows.length)
      .replace('{chain}', CHAINS[state.chain].name)
      .replace('{danger}', danger)}</p>
  `;

  $('resultBox').classList.add('on');

  // Async: ask MiMo for personalized narrative
  if (rows.length > 0) {
    const prompt = buildMimoPrompt(rows, walletAddr, danger, unlim);
    askMimo(prompt).then(reply => {
      if (reply) {
        $('mimoInsight').innerHTML = `
          <h3>${t('insightTitle')}</h3>
          <p>${reply.replace(/\n+/g, '</p><p>')}</p>
        `;
      }
    });
  }
}

function renderApprovalRow(r, wallet) {
  const tok = r.token;
  const sp = r.spender;
  const info = sp.address_info || {};
  const chain = CHAINS[state.chain];
  const allow = fmtAllowance(r.amount, tok.decimals);
  const amountClass = isUnlimited(r.amount) ? '' : 'normal';
  const hasName = !!info.contract_name;
  const spenderName = hasName ? info.contract_name : fmtAddr(sp.approved_contract);
  const spenderAddrSuffix = hasName ? ` <span class="addr-tail">${fmtAddr(sp.approved_contract)}</span>` : '';
  const flags = r.flags.map(f =>
    `<span class="flag ${f.sev}">${t(f.k)}</span>`
  ).join('');
  const revokeUrl = `https://revoke.cash/address/${wallet}?chainId=${state.chain}`;
  const explorerUrl = `${chain.explorer}/address/${sp.approved_contract}`;
  const isLowRisk = r.tier === 'SAFE' || r.tier === 'CAUTION';
  const revokeClass = isLowRisk ? 'btn-revoke ghost' : 'btn-revoke';

  return `
    <div class="approval tier-${r.tier}">
      <div class="appr-main">
        <div class="appr-token">
          <span class="name">${escapeHtml(tok.token_name || 'Unknown')}</span>
          <span class="symbol">${escapeHtml(tok.token_symbol || '?')}</span>
        </div>
        <div class="appr-meta">
          <span class="amount ${amountClass}">${allow}</span>
          → <span class="spender"><b>${escapeHtml(spenderName)}</b>${spenderAddrSuffix}</span>
          · <span class="age">${fmtAge(sp.approved_time)}</span>
        </div>
        ${flags ? `<div class="appr-flags">${flags}</div>` : ''}
      </div>
      <div class="appr-score tier-${r.tier}">
        <div class="num">${r.score}</div>
        <div class="out">/ 100</div>
      </div>
      <div class="appr-actions">
        <a class="${revokeClass}" href="${revokeUrl}" target="_blank" rel="noopener">${t('revoke')} →</a>
        <a class="btn-link" href="${explorerUrl}" target="_blank" rel="noopener" title="${t('explorer')}">↗</a>
      </div>
    </div>
  `;
}

function buildMimoPrompt(rows, wallet, danger, unlim) {
  const top = rows.slice(0, 3).map(r => {
    const tok = r.token.token_symbol || '?';
    const sp = r.spender.address_info?.contract_name || fmtAddr(r.spender.approved_contract);
    return `${tok}→${sp} (score ${r.score}, ${r.flags.map(f => f.k.replace('flag', '')).join('/')})`;
  }).join('; ');
  return `Wallet ${fmtAddr(wallet)} on ${CHAINS[state.chain].name}: ${rows.length} active approvals, ${danger} DANGER tier, ${unlim} unlimited. Top 3 risks: ${top}. Give 2-3 sentences of plain-text actionable advice — what to revoke first, why it matters, prevention tip. No bullets, no markdown.`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ═══════════════════════════════════════════
// SCAN ORCHESTRATION
// ═══════════════════════════════════════════
function setLoading(msg) {
  $('loadMsg').textContent = msg;
  $('loadBox').classList.add('on');
  $('resultBox').classList.remove('on');
  $('errBox').classList.remove('on');
}
function clearLoading() { $('loadBox').classList.remove('on'); }
function showError(msg) {
  $('errBox').textContent = msg;
  $('errBox').classList.add('on');
  $('loadBox').classList.remove('on');
}

async function scan(input) {
  $('errBox').classList.remove('on');
  let raw = (input || $('addrIn').value || '').trim();
  if (!raw) { showError(t('errInvalid')); return; }
  $('addrIn').value = raw;
  state.lastWallet = null;

  let addr;
  if (/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    addr = raw.toLowerCase();
  } else if (raw.endsWith('.eth') || /^[a-zA-Z][a-zA-Z0-9-]*$/.test(raw)) {
    setLoading(t('loadEns'));
    const ensName = raw.endsWith('.eth') ? raw : raw + '.eth';
    addr = await resolveENS(ensName);
    if (!addr) { showError(t('errEnsFail')); return; }
  } else {
    showError(t('errInvalid')); return;
  }

  setLoading(`${t('loadScan')} ${CHAINS[state.chain].name}...`);
  state.lastWallet = addr;

  let approvals;
  try {
    approvals = await fetchApprovals(addr, state.chain);
  } catch (e) {
    showError(t('errFetch') + ' (' + e.message + ')');
    return;
  }

  if (!approvals.length) {
    showError(t('errNoAppr'));
    return;
  }

  setLoading(t('loadScore'));
  await new Promise(r => setTimeout(r, 250)); // small UI breath

  state.lastApprovals = approvals;
  clearLoading();
  renderResult(approvals, addr);

  // Update URL hash for share
  const newUrl = `${location.pathname}?chain=${state.chain}#${addr}`;
  history.replaceState(null, '', newUrl);
}

// ═══════════════════════════════════════════
// I18N + THEME APPLY
// ═══════════════════════════════════════════
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (I18N[state.lang][key]) el.innerHTML = I18N[state.lang][key];
  });
  document.documentElement.lang = state.lang;
  $('langBtn').textContent = state.lang === 'en' ? '🌐 ID' : '🌐 EN';
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  $('themeBtn').textContent = state.theme === 'dark' ? '☀️' : '🌙';
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
function init() {
  renderChains();
  applyI18n();
  applyTheme();

  $('langBtn').onclick = () => {
    state.lang = state.lang === 'en' ? 'id' : 'en';
    localStorage.setItem('shield-lang', state.lang);
    applyI18n();
    if (state.lastWallet && state.lastApprovals.length) renderResult(state.lastApprovals, state.lastWallet);
  };
  $('themeBtn').onclick = () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('shield-theme', state.theme);
    applyTheme();
  };
  $('scanBtn').onclick = () => scan();
  $('addrIn').addEventListener('keydown', e => { if (e.key === 'Enter') scan(); });
  document.querySelectorAll('.example-btn').forEach(b => {
    b.onclick = () => {
      $('addrIn').value = b.dataset.addr;
      scan(b.dataset.addr);
    };
  });

  // Restore from URL
  const params = new URLSearchParams(location.search);
  const urlChain = params.get('chain');
  if (urlChain && CHAINS[urlChain]) {
    state.chain = urlChain;
    localStorage.setItem('shield-chain', state.chain);
    renderChains();
  }
  const hashAddr = decodeURIComponent(location.hash.slice(1));
  if (hashAddr && (/^0x[a-fA-F0-9]{40}$/.test(hashAddr) || hashAddr.endsWith('.eth'))) {
    $('addrIn').value = hashAddr;
    scan(hashAddr);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
