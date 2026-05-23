# 🛡️ MimoShield

> Wallet Permission Auditor — find every forgotten approval draining your wallet across 5 EVM chains. 10-signal risk scoring. Free revoke. Powered by Xiaomi MiMo V2.5.

🔗 **Live:** https://gyoomei.github.io/mimoshield/
📂 **Repo:** https://github.com/gyoomei/mimoshield

## What it does

You paste a wallet address (or `.eth` name). MimoShield scans every active ERC-20 token approval on the chain you pick, scores each `(token → spender)` pair across 10 risk signals, ranks them worst-to-best, and gives you a one-click deep link to `revoke.cash` for the dangerous ones. Your funds never leave your wallet — this is a read-only audit tool.

```
You paste:    0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503
Chain:        Ethereum
Found:        3 active approvals
Score:        100 / 100  · DANGER tier
Top risks:    CoW Protocol Token → 0xe380... (MALICIOUS, CLOSED-SRC, EOA-SPENDER, AGED 365d+)
              Sigma Finance     → 0x...
Revoke:       https://revoke.cash/address/0x47ac...?chainId=1
```

## Features

| Capability | Detail |
|---|---|
| **Multi-chain** | Ethereum (1), BSC (56), Polygon (137), Arbitrum (42161), Base (8453) |
| **10-signal scoring** | 4 critical (40pt), 4 high (20pt), 4 medium (10pt), 4 low (5pt). Max 100. |
| **Risk tiers** | SAFE (0-15) · CAUTION (16-40) · RISKY (41-70) · DANGER (71+) |
| **One-click revoke** | Deep-links to revoke.cash with wallet + chain pre-filled |
| **AI narrative** | MiMo V2.5 reads your top risks and gives 2-3 sentences of plain-text advice |
| **Bilingual** | English / Bahasa Indonesia toggle |
| **Dark / Light** | WCAG-AA contrast both modes |
| **Mobile** | Responsive 320px → 1440px, no horizontal scroll |
| **Read-only** | Never asks for keys or signatures |

## How it works

```
┌──────────────────────────────────────────────────────────┐
│  Wallet input (0x... / ENS)                              │
│         ↓                                                │
│  ENS resolve → ensideas.com (free)                       │
│         ↓                                                │
│  Approval scan → GoPlus Security API v2 (free, no key)   │
│         ↓                                                │
│  Score 10 signals per (token, spender) pair              │
│         ↓                                                │
│  Rank worst → best, classify tiers                       │
│         ↓                                                │
│  AI narrative → text.pollinations.ai (free MiMo gateway) │
│         ↓                                                │
│  Render + per-row revoke deep links → revoke.cash        │
└──────────────────────────────────────────────────────────┘
```

## 10-signal risk rubric

### Critical (+40 pts each)
| Signal | Why it matters |
|---|---|
| Unlimited allowance | `2^256-1` — drained in one tx |
| Malicious spender | GoPlus flagged contract or creator |

### High (+20 pts each)
| Signal | Why it matters |
|---|---|
| Closed-source contract | You cannot audit what it can do |
| EOA spender | Approval to a regular wallet — almost always phishing |

### Medium (+10 pts each)
| Signal | Why it matters |
|---|---|
| Massively over-funded | Allowance > balance × 1000 |
| Aged over 365 days | #1 source of drained wallets per Chainabuse |
| Risky token | Honeypot / rebase trap flag |

### Low (+5 pts each)
| Signal | Why it matters |
|---|---|
| Fresh contract | Deployed < 30 days ago, thin track record |
| Unverified label | No trust list, no contract name |
| Suspicious creator | Closed-source AND no contract name |

## Try these examples

| Address | Chain | Expected |
|---|---|---|
| `0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503` | Ethereum | DANGER · forgotten DeFi approvals |
| `0xF977814e90dA44bFA03b6295A0616a897441aceC` | Ethereum | RISKY · Binance-related, 30 approvals |
| `vitalik.eth` | Ethereum | SAFE · Vitalik revokes regularly |

## Stack

| Layer | Tool |
|---|---|
| Frontend | Vanilla HTML + CSS + JS (zero build, zero deps) |
| Approval data | [GoPlus Security API](https://gopluslabs.io) v2 (free, no key, 5 chains) |
| ENS | [ensideas.com](https://api.ensideas.com) free resolver |
| AI narrative | [Pollinations.ai](https://pollinations.ai) free gateway → MiMo V2.5 |
| Revoke flow | [revoke.cash](https://revoke.cash) deep links (you sign in your own wallet) |
| Hosting | GitHub Pages |
| Typography | Geist + Geist Mono (Vercel) |

## Architecture decisions

- **Single HTML, zero build.** No npm, no bundler, no backend. Browser opens `index.html` directly. Faster to ship, bulletproof against deploy issues.
- **Read-only.** Never asks for `eth_signTypedData`, never connects a wallet. The only place you sign is on revoke.cash, in your own wallet, after you click the deep link.
- **AI advice is optional.** If Pollinations rate-limits, a local fallback narrative renders from the score data — the tool still works.
- **Risk model is transparent.** Every point in every score is documented in the rubric section. No hidden weights, no LLM-determined risk.
- **GoPlus over Etherscan.** Etherscan has approval data but requires a key + paid tier for >5 req/sec. GoPlus is free and gives the security signals (malicious flags, contract verification, creator history) all in one call.

## Roadmap

- [ ] NFT approval scanning (ERC-721 + ERC-1155)
- [ ] Bulk revoke estimator (gas cost projection per chain)
- [ ] Approval history timeline (when you approved, when last used)
- [ ] PDF audit report export

## Run locally

```bash
git clone https://github.com/gyoomei/mimoshield.git
cd mimoshield
python3 -m http.server 8080
# open http://localhost:8080
```

## License

MIT

---

**Built with 🧠 [Xiaomi MiMo V2.5](https://100t.xiaomimimo.com/) · Submitted to MiMo 100T Creator Program · By [@gyoomei](https://github.com/gyoomei)**
