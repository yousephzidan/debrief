import spacy
import httpx
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Enable CORS for browser extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

nlp = spacy.load("de_core_news_sm")


class TextRequest(BaseModel):
    text: str


async def analyze_text_spacy(text: str):
    def process():
        doc = nlp(text)
        result = []

        for token in doc:
            result.append({
                "text": token.text,
                "pos": token.pos_,
                "dep": token.dep_,
                "lemma": token.lemma_,
                "morph": token.morph.to_dict(),
                "case": token.morph.get("Case")  
            })

        return result

    return await asyncio.to_thread(process)


async def translate(text: str):
    url = "http://localhost:5000/translate"

    async with httpx.AsyncClient() as client:
        res = await client.post(url, json={
            "q": text,
            "source": "de",
            "target": "en"
        })

    return res.json()["translatedText"]


@app.post("/analyze")
async def analyze(req: TextRequest):
    translation_task = translate(req.text)
    spacy_task = analyze_text_spacy(req.text)

    translation, tokens = await asyncio.gather(
        translation_task,
        spacy_task
    )

    return {
        "original": req.text,
        "translation": translation,
        "tokens": tokens
    }

