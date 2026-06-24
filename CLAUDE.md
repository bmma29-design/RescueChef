# RescueChef — תיעוד פרויקט

## מטרת האפליקציה
עוזר בישול חכם מבוסס AI שמכיר את המשתמש לעומק — מגבלות תזונה, אלרגיות, רמת מיומנות, ומה יש לו במקרר — ומספק עצות מדויקות בזמן אמת. מטרת-על: Zero Waste — למנוע בזבוז חומרי גלם יקרים ולשפר את מיומנות הבישול הביתית.

## קהל יעד
בישול ביתי — אנשים שרוצים לבשל טוב יותר ממה שיש להם, עם מינימום בזבוז. בתי ספר מובילים בעולם כהשראה.

## טכנולוגיות
- **Frontend:** SPA אחד — `index.html` (HTML + CSS + JavaScript inline, ללא framework)
- **Backend:** Serverless functions על Vercel
- **AI Model:** `claude-sonnet-4-6` דרך Anthropic API
- **Speech:** `webkitSpeechRecognition` לקלט קולי (STT) ו-`SpeechSynthesisUtterance` לפלט (TTS)
- **State:** `localStorage` לפרופיל משתמש ומונה שאלות יומי

## מבנה הקוד
```
RescueChef/
├── index.html          # כל ה-UI — בחירת שפה, פרופיל, ממשק צ'אט
├── api/
│   ├── chat.js         # Proxy ל-Anthropic API + rate limiting
│   └── country.js      # זיהוי מדינה לפי x-vercel-ip-country header
└── CLAUDE.md
```

### api/chat.js
- **Rate limit דקתי:** 10 בקשות לדקה לכל IP
- **Rate limit יומי:** 5 שאלות ביום למשתמש חינמי (מנוהל דרך `rc_daily` ב-`localStorage`)
- משתמש `isPro: true` עוקף את המגבלה היומית
- שגיאת מגבלה יומית מוחזרת כ-`DAILY_LIMIT_REACHED`

### index.html
- שפה: עברית ו-RTL כברירת מחדל, תמיכה בשפות נוספות
- פרופיל משתמש: שם, מגדר, רמת מיומנות, דיאטה, אלרגיות — מוזנים ל-System Prompt
- מד דחיפות (Urgency Meter): צבע גרפי ירוק/כתום/אדום לפי תג `[URGENCY:full]` בתגובת ה-AI
- Inline Timers: תגיות `[TIMER:seconds:label]` הופכות לטיימרים אינטראקטיביים
- TTS: קריאה קולית אוטומטית של תגובות ה-AI

## מודל עסקי (Freemium)
| תוכנית | מגבלה | מחיר |
|--------|-------|------|
| Free | 5 שאלות ביום | חינם |
| Pro | ללא הגבלה | $4.99/חודש או $39.99/שנה |

- כשמגיעים למגבלה: `Blur Paywall` — CSS `filter: blur(5px); pointer-events: none` על התוכן + כפתור רכישה
- תשלום דרך Paywall מול Stripe (לא מומש עדיין)

## מצב אלפא
`ALPHA_MODE = true` — מבטל מגבלה יומית ו-Paywall לצורך בדיקות. בגרסה ה-Alpha כל המשתמשים מקבלים `Pro Unlocked` ומוצג להם תג `Alpha Badge`.

## System Prompt
האישיות של ה-AI: שף קולינרי בכיר ובוגר *Le Cordon Bleu*, בעל ידע עמוק בכימיה ופיזיקה של מזון. כולל חוקים מתמטיים לשינוי גודל תבנית אפייה (Factor = r_original² / r_new²) וכלל זמן אפייה קריטי.

## פלטת עיצוב
```
--bg:      #FAF6EF  (רקע שמנת)
--text:    #5C3D1A  (חום כהה)
--accent:  #C8A850  (זהב — צבע ראשי לכפתורים וסימונים)
```

## החלטות שהתקבלו

### מוצר
- **5 שאלות חינם ביום** (שונה מ-10 — מספיק להבין ערך, לא מספיק להסתפק בחינמי)
- `before-redesign` — git tag שמור על המצב לפני ה-redesign

### עיצוב (סשן 2, יוני 2026)
- **Tabler Icons** במקום אמוג'ים בכל ממשק המשתמש — CDN: `@tabler/icons-webfont@latest`
- אמוג'ים נשמרים רק: דגלי שפות, תוכן תגובות AI, אפשרויות תזונה/אלרגיות
- כפתורי כותרת (בית/פרופיל/נקה): אייקון + מילה קצרה תמיד
- **מד דחיפות** עוצב מחדש: bubble צבעוני (ירוק/כתום/אדום) עם אייקון Tabler במקום progress bar
- **בועות צ'אט**: padding 10px 14px, font-size 13px, line-height 1.7
- **Input row + Welcome box**: עיגול מלא (border-radius 26px), גבול 0.5px
- **FAQ** מוסתר מאחורי toggle — מסך הפתיחה נקי יותר

### כפתורי קיצור (Welcome Screen)
5 כפתורים מתחת לתיבת הטקסט:
| כפתור | context | הודעת פתיחה |
|-------|---------|-------------|
| הצילו! משהו הלך עקום | `emergency` | "הצילו! משהו הלך עקום במטבח" |
| רוצה שידברו עליי | `impress` | "אני רוצה שידברו עליי — עזרי לי להרשים" |
| הילדים גם ייאכלו את זה | `kids` | "הילדים גם ייאכלו את זה — מה מכינים?" |
| תמציאי לי משהו מהכלום | `fridge` | AI שואל: "מה יש לך עכשיו במקרר או במזווה?" |
| תסבירי לי למה זה קרה | `learn` | "תסבירי לי למה זה קרה" |

### לוגיקת System Prompt
- `window.activeContext` נקבע לפי כפתור שנלחץ
- `getSystemPrompt()` מזריק `CURRENT SESSION FOCUS` לפי ה-context
- כרטיס 💡 Prevention מופיע רק בתגובת ה-AI הראשונה בכל שיחה (`firstAIMessage`)
- `clearChat()` מאפס `firstAIMessage=true` ו-`activeContext=null`

### לא מומש עדיין
- Stripe / תשלום Pro אמיתי
- הודעת 🪄 (fridge) לא נכנסת ל-`chatHistory` — כשהמשתמש עונה, קלוד לא זוכר ששאל
- `serve.js` + `.claude/launch.json` — סרבר לוקאלי לצורך פיתוח (לא חלק מה-production)
