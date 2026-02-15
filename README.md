# Debrief - German Text Analyzer 🚀

**What is this?**  
This is a magical tool that helps you understand German sentences! When you highlight German text on any website, it shows you:
- The English translation
- What each word means
- Grammar info (like if it's a noun, verb, etc.)

It's like having a German teacher right in your browser! 🎓

---

## What You Need Before Starting

- **Python 3.11 or newer** (like a special language your computer understands)
- **Node.js** (to build the extension)
- **Google Chrome** browser

---

## How to Set It Up (Step by Step)

### 1. Install Python Stuff 📦

Open your terminal/command prompt and type:

```bash
pip install fastapi uvicorn spacy httpx libretranslate
python -m spacy download de_core_news_sm
```

### 2. Build the Extension 🔨

```bash
cd frontend
npm install
npm run build
```

### 3. Copy Important Files 📋

After building, you need to copy some files:

```bash
cp public/manifest.json dist/
cp -r src dist/
```

### 4. Start the Translator (LibreTranslate) 🌍

This tool needs a translator to convert German to English. Run LibreTranslate Locally:

```bash
libretranslate --load-only de,en
```
**Wait a minute** for it to download and start. You can check if it's ready by opening: http://localhost:5000

### 5. Run the Brain (Backend) 🧠

In the main folder (where `backend.py` lives), run:

```bash
uvicorn backend:app --reload --port 8000
```

Keep this window open! This is the brain that analyzes text.

### 6. Add to Chrome 🌐

1. Open Chrome and go to: `chrome://extensions/`
2. Turn on **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the `frontend/dist` folder
5. Done! ✨

---

## How to Use It

1. Go to any website with German text
2. **Highlight** the German text with your mouse
3. A beautiful popup appears with the translation! 🎉

---

## Troubleshooting

**Popup doesn't show?**
- Make sure LibreTranslate is running (step 4)
- Make sure the backend is running (step 5)
- Check that you copied the files (step 3)
- Try reloading the extension in Chrome

**Still not working?**
- Make sure you're using Python 3.11+
- Check that all npm packages installed correctly

---

Made with ❤️ to make learning German easier!
