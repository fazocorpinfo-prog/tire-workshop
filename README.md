# Tire Workshop — Website + Admin Panel

Zamonaviy tire workshop uchun to'liq websayt: animatsiyali landing, contact form, Telegram bot, admin panel chartlar bilan, 4 ta dizayn (Apple / Cyberpunk / Dark / Light).

## Imkoniyatlar

**Public sayt** (`/`)
- 4 ta zamonaviy mavzu (theme switcher tepada)
- Hero scroll animatsiyalari, floating blur effekt
- Bo'limlar: Xizmatlar, Ishlarimiz, Jamoa, Manzil (OpenStreetMap), Bog'lanish, Ijtimoiy tarmoqlar
- Mobile responsive (hamburger menyu)
- Contact form → Telegram bot + Admin panel

**Admin panel** (`/admin`)
- Login: `admin / admin123` (default)
- Dashboard: stat-kartalar, Chart.js (line + doughnut)
- So'rovlar — "Bog'landim" tugma → animatsiya bilan arxivga uchadi
- CRUD: xizmatlar, ishlarimiz, jamoa
- Sozlamalar: nom, manzil, ijtimoiy linklar, xarita
- Rasm yuklash (multer → `/uploads`)
- 4 ta mavzu admin uchun ham

## Ishga tushirish

```bash
npm install
npm start
```

Server: http://localhost:3000
Admin:  http://localhost:3000/admin

## Telegram bot ulash

1. `.env.example` ni `.env` qilib nusxalang
2. [@BotFather](https://t.me/BotFather) dan bot yarating va tokenni `TELEGRAM_BOT_TOKEN` ga qo'ying
3. [@userinfobot](https://t.me/userinfobot) orqali chat ID ni oling va `TELEGRAM_CHAT_ID` ga qo'ying (admin uchun shaxsiy yoki guruh chat ID)
4. Botingiz bilan suhbat boshlang (`/start`) — keyin sayt orqali so'rov yuborilganda Telegram ga keladi

`.env` bo'lmasa — so'rovlar konsolga log qilinadi (admin panelda baribir ko'rinadi).

## Fayl tuzilishi

```
/server.js          — Express server
/db.js              — JSON file-based store
/database.json      — auto-generated (saqlanadi)
/public/
  index.html        — public site
  admin.html        — admin SPA
  css/
    themes.css      — 4 ta mavzu (CSS variables)
    main.css        — public stillar + animatsiyalar
    admin.css       — admin layout
  js/
    theme.js        — mavzu almashtirish
    animations.js   — IntersectionObserver scroll animatsiyalar
    main.js         — public sayt logikasi
    admin.js        — admin SPA logikasi
/uploads/           — yuklangan rasmlar
```

## Production uchun

1. `.env` da `SESSION_SECRET` ni uzun random stringga o'zgartiring
2. `ADMIN_PASS` ni murakkab parolga almashtiring
3. HTTPS orqali ishlating (nginx/caddy reverse proxy)
4. `database.json` ni muntazam backup qiling
