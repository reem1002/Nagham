# نغم · Nagham — Offline Music App (MERN + Android)

تطبيق موسيقى شخصي: مكتبتك على السيرفر (Node + Express + MongoDB)، وواجهة React بتشتغل على المتصفح أو كتطبيق Android حقيقي عن طريق Capacitor.
الأغاني اللي بتنزّليها على الموبايل بتشتغل **من غير إنترنت**، والموسيقى **بتفضل شغالة والشاشة مقفولة** مع أزرار التحكم على شاشة القفل والإشعارات.

> التطبيق بيشغّل ملفات صوتية إنتِ عندك. مافيهوش تحميل من يوتيوب أو أي منصة تانية.

---

## المميزات

| | |
|---|---|
| **المشغّل** | Play/Pause · Previous/Next · Shuffle · Repeat (all / one) · Seek · Volume · Queue بالسحب لإعادة الترتيب · Play next / Add to queue · Sleep timer · Lyrics |
| **الأوفلاين** | تحميل أغنية / ألبوم / فنان / بلاي ليست كاملة للجهاز (IndexedDB) · التطبيق يفتح ويشتغل من غير نت · الإحصائيات والمفضلة بتتسجل أوفلاين وتتزامن لما النت يرجع |
| **الشاشة المقفولة** | Android: foreground service + media notification (`@jofr/capacitor-media-session`) · المتصفح/PWA: Media Session API |
| **الإضافة** | اختيار ملفات أو فولدر كامل · Share من واتساب/تليجرام/Files للتطبيق مباشرة · قراءة الاسم والفنان والألبوم والغلاف والكلمات من الـ tags · لو مفيش tags: `فيروز - نسم علينا الهوى.mp3` بيتقسم لوحده |
| **فيروز** | صفحة فنانة جاهزة، وأي ملف مكتوب عليه Fairuz / فيروز / Fairouz / Fayrouz بيتجمع في نفس الصفحة |
| **المكتبة** | Home · Search (عربي وإنجليزي، بيتجاهل أ/إ/آ و ة/ه و ى/ي والتشكيل) · Songs · Artists · Albums · Playlists · Favorites · On this device · Stats |
| **الحسابات** | JWT auth، أو **"Use on this device only"** من غير حساب ولا سيرفر خالص |

---

## هيكل المشروع

```
nagham/
├── server/                 Node + Express + MongoDB API
│   └── src/
│       ├── models/         User, Artist, Album, Song, Playlist, PlayEvent
│       ├── routes/         auth, songs (upload + range streaming), artists, albums,
│       │                   playlists, me (favorites, history, stats, home), search
│       ├── utils/          importAudio (tags + covers + dedupe), text (Arabic search)
│       └── scripts/seed.js demo account + Fairuz page (+ demo tones with --demo)
├── client/                 React (Vite) + PWA + Capacitor
│   ├── src/
│   │   ├── player/engine.js     محرك التشغيل (queue, shuffle, repeat, media session, حفظ المكان)
│   │   ├── lib/downloads.js     مدير التحميل والمكتبة الأوفلاين (IndexedDB)
│   │   ├── lib/data.js          طبقة البيانات: سيرفر ← كاش ← أوفلاين
│   │   ├── lib/importer.js      الاستيراد (رفع للسيرفر أو حفظ على الجهاز)
│   │   ├── lib/native.js        Capacitor: شاشة القفل + Share intent
│   │   ├── sw.js                Service worker (offline shell + share target)
│   │   └── pages/               كل الشاشات
│   └── android/                 مشروع Android Studio جاهز
├── .github/workflows/android-apk.yml   يبني APK على GitHub تلقائيًا
└── docker-compose.yml                  MongoDB محلي
```

---

## التشغيل على الكمبيوتر

المتطلبات: Node 20+ و MongoDB (محلي بـ Docker، أو MongoDB Atlas المجاني).

```bash
# 1) MongoDB
docker compose up -d            # أو حطي رابط Atlas في server/.env

# 2) السيرفر
cd server
cp .env.example .env            # غيّري JWT_SECRET
npm install
npm run seed:demo               # demo@nagham.app / nagham123 + صفحة فيروز + نغمات تجريبية
npm run dev                     # http://localhost:5000

# 3) الواجهة (terminal تاني)
cd client
npm install
npm run dev                     # http://localhost:5173
```

افتحي `http://localhost:5173`، سجّلي دخول، وروحي على **Import** وضيفي ملفاتك.

> `npm run seed` من غير `--demo` بيعمل الحساب وصفحة فيروز بس، من غير النغمات التجريبية.

---

## تنزيل التطبيق على الموبايل (Android)

### الطريقة الأسهل: GitHub يبنيه لك
1. ارفعي المشروع على GitHub repo.
2. من تبويب **Actions** → **Android APK** → **Run workflow** (ممكن تكتبي عنوان السيرفر في الخانة، أو تسيبيه وتحطيه من Settings في التطبيق).
3. لما يخلص، نزّلي `nagham-debug-apk` من **Artifacts**، فكّي الـ zip، وافتحي `app-debug.apk` على الموبايل (هيطلب السماح بالتثبيت من مصادر غير معروفة).

### من Android Studio
```bash
cd client
VITE_API_URL=https://your-api.example.com npm run android:sync   # اختياري: عنوان السيرفر
npx cap open android
```
من Android Studio: وصّلي الموبايل بـ USB (Developer options → USB debugging) واضغطي ▶ Run، أو **Build → Build APK(s)**.

### كـ PWA (من غير بناء خالص)
لو السيرفر شغال على رابط HTTPS، افتحيه من Chrome على الموبايل → ⋮ → **Install app**. هيظهر في قايمة Share، ويشتغل أوفلاين، والتشغيل بيكمل والشاشة مقفولة في أغلب الأجهزة. تطبيق الـ APK أضمن في التشغيل في الخلفية.

---

## السيرفر: محتاجاه ولا لأ؟

- **مش محتاجاه** لو اخترتي "Use on this device only": الأغاني بتتحفظ جوه التطبيق على الموبايل بس.
- **محتاجاه** عشان المكتبة تبقى على حسابك وتشوفيها من أكتر من جهاز. الموبايل بيكلّم السيرفر وقت الإضافة والتحميل بس، وبعد كده كل اللي نزّلتيه بيشتغل من غير نت.

خيارات الاستضافة:
- **على اللابتوب في البيت:** شغّلي السيرفر، وفي التطبيق Settings → Server اكتبي `http://IP-اللابتوب:5000` (لازم نفس الواي فاي).
- **أونلاين:** MongoDB Atlas (مجاني) + أي استضافة Node فيها **disk دائم** للملفات (Railway volume، Render disk، أو VPS). الملفات بتتحفظ في `server/uploads/`.

---

## الـ API

كل المسارات محمية بـ `Authorization: Bearer <token>` ما عدا auth و health.

| Method | Path | |
|---|---|---|
| POST | `/api/auth/register` · `/api/auth/login` | حساب جديد / دخول |
| GET | `/api/auth/me` | المستخدم الحالي |
| GET | `/api/songs?q=&artist=&album=&sort=recent\|title\|plays` | الأغاني |
| POST | `/api/songs/upload` | رفع ملفات (`files[]`، واختياري `artist`, `album`) |
| GET | `/api/songs/:id/stream` | تشغيل بـ Range (و `?download=1` للتحميل) |
| PATCH / DELETE | `/api/songs/:id` | تعديل البيانات والكلمات / حذف |
| GET | `/api/artists` · `/api/artists/:id` | الفنانين / صفحة فنان |
| GET | `/api/albums` · `/api/albums/:id` | الألبومات |
| CRUD | `/api/playlists` · `/api/playlists/:id/songs` | البلاي ليستس |
| GET/POST/DELETE | `/api/me/favorites/:songId` | المفضلة |
| POST/GET | `/api/me/history` · `/api/me/recent` · `/api/me/stats` · `/api/me/home` | السجل والإحصائيات |
| GET | `/api/search?q=` | بحث في كل حاجة |

---

## ملاحظات تقنية

- **التشغيل في الخلفية على Android:** الـ WebView بيتجمد لما الشاشة تتقفل، فالـ plugin بيشغّل foreground service نوعه `mediaPlayback` طول ما فيه حاجة شغالة. الصلاحيات موجودة في `AndroidManifest.xml`.
- **الأوفلاين:** كل أغنية متنزلة متخزنة كـ Blob في IndexedDB مع الغلاف. التطبيق بيطلب `navigator.storage.persist()` عشان النظام ما يمسحهاش. كل رد من الـ API بيتخزن، فالشاشات بتفتح من غير نت.
- **الـ Share:** في الـ APK عن طريق `send-intent`، وفي الـ PWA عن طريق Web Share Target في الـ service worker.
- **HTTP على الشبكة المحلية:** `capacitor.config.json` فيه `androidScheme: "http"` و `cleartext: true` عشان التطبيق يقدر يكلّم سيرفر على `http://192.168.x.x`. لو السيرفر HTTPS بس، ممكن تشيليهم.
- **مكان الملفات على السيرفر:** `server/uploads/audio` (اسم الملف = sha1، فالملف المكرر ما بيترفعش مرتين) و `server/uploads/covers`.

## أفكار للمرحلة الجاية
- كلمات متزامنة (LRC) مع التمرير التلقائي
- Equalizer و crossfade
- تخزين الملفات على S3 / Cloudinary بدل الـ disk
- iOS (محتاج Share Extension في Xcode للـ Share)
