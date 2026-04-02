import spacy
import httpx
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

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


CONJUGATIONS = {
    "sein": {"ich": "bin", "du": "bist", "er/sie/es": "ist", "wir": "sind", "ihr": "seid", "sie/Sie": "sind"},
    "haben": {"ich": "habe", "du": "hast", "er/sie/es": "hat", "wir": "haben", "ihr": "habt", "sie/Sie": "haben"},
    "werden": {"ich": "werde", "du": "wirst", "er/sie/es": "wird", "wir": "werden", "ihr": "werdet", "sie/Sie": "werden"},
    "gehen": {"ich": "gehe", "du": "gehst", "er/sie/es": "geht", "wir": "gehen", "ihr": "geht", "sie/Sie": "gehen"},
    "kommen": {"ich": "komme", "du": "kommst", "er/sie/es": "kommt", "wir": "kommen", "ihr": "kommt", "sie/Sie": "kommen"},
    "machen": {"ich": "mache", "du": "machst", "er/sie/es": "macht", "wir": "machen", "ihr": "macht", "sie/Sie": "machen"},
    "sagen": {"ich": "sage", "du": "sagst", "er/sie/es": "sagt", "wir": "sagen", "ihr": "sagt", "sie/Sie": "sagen"},
    "wissen": {"ich": "weiß", "du": "weißt", "er/sie/es": "weiß", "wissen": "wissen", "ihr": "wisst", "sie/Sie": "wissen"},
    "können": {"ich": "kann", "du": "kannst", "er/sie/es": "kann", "wir": "können", "ihr": "könnt", "sie/Sie": "können"},
    "müssen": {"ich": "muss", "du": "musst", "er/sie/es": "muss", "wir": "müssen", "ihr": "müsst", "sie/Sie": "müssen"},
    "sollen": {"ich": "soll", "du": "sollst", "er/sie/es": "soll", "wir": "sollen", "ihr": "sollt", "sie/Sie": "sollen"},
    "wollen": {"ich": "will", "du": "willst", "er/sie/es": "will", "wir": "wollen", "ihr": "wollt", "sie/Sie": "wollen"},
    "dürfen": {"ich": "darf", "du": "darfst", "er/sie/es": "darf", "wir": "dürfen", "ihr": "dürft", "sie/Sie": "dürfen"},
}

COMPOUND_PATTERNS = {
    "Fernseher": ("Fern", "Seher"),
    "Großmutter": ("Groß", "Mutter"),
    "Großvater": ("Groß", "Vater"),
    "Haustür": ("Haus", "Tür"),
    "Schlafzimmer": ("Schlaf", "Zimmer"),
    "Küchentisch": ("Küchen", "Tisch"),
    "Autofahrer": ("Auto", "Fahrer"),
    "Bahnhof": ("Bahn", "Hof"),
    "Flughafen": ("Flug", "Hafen"),
    "Wetterbericht": ("Wetter", "Bericht"),
    "Zeitungsartikel": ("Zeitungs", "Artikel"),
    "Krankenwagen": ("Kranken", "Wagen"),
    "Feuerwehr": ("Feuer", "Wehr"),
    "Einkaufstasche": ("Einkaufs", "Tasche"),
    "Geschäftsführer": ("Geschäfts", "Führer"),
}

WORD_TRANSLATIONS = {
    "der": "the", "die": "the", "das": "the", "ein": "a/an", "eine": "a/an",
    "ich": "I", "du": "you", "er": "he", "sie": "she", "es": "it", "wir": "we", "ihr": "you",
    "haben": "have", "sein": "to be", "werden": "will/become", "gehen": "go", "kommen": "come",
    "machen": "make/do", "sagen": "say", "sehen": "see", "wissen": "know", "können": "can",
    "müssen": "must", "sollen": "should", "wollen": "want", "dürfen": "may",
    "und": "and", "oder": "or", "aber": "but", "nicht": "not", "kein": "no",
    "ist": "is", "sind": "are", "war": "was", "waren": "were", "wird": "becomes",
    "mit": "with", "von": "from", "zu": "to", "nach": "after/to", "auf": "on",
    "in": "in", "an": "at", "aus": "out", "bei": "at", "über": "about/over",
    "hund": "dog", "katze": "cat", "haus": "house", "mann": "man", "frau": "woman",
    "kind": "child", "zeit": "time", "jahr": "year", "tag": "day", "morgen": "morning/tomorrow",
    "heute": "today", "gestern": "yesterday", "jetzt": "now", "immer": "always",
    "sehr": "very", "gut": "good", "schlecht": "bad", "groß": "big", "klein": "small",
    "neu": "new", "alt": "old", "schön": "beautiful", "schnell": "fast", "langsam": "slow",
    "essen": "eat", "trinken": "drink", "schlafen": "sleep", "laufen": "run", "stehen": "stand",
    "sitzen": "sit", "legen": "lay", "nehmen": "take", "geben": "give", "kommen": "come",
    "ja": "yes", "nein": "no", "bitte": "please", "danke": "thanks", "sorry": "sorry",
    "mehr": "more", "viel": "much", "wenig": "little", "alles": "everything", "nichts": "nothing",
    "etwas": "something", "jeder": "every", "ander": "other", "welch": "which", "was": "what",
    "wer": "who", "wo": "where", "wann": "when", "wie": "how", "warum": "why",
    "fernseher": "TV", "mutter": "mother", "vater": "father", "eltern": "parents",
    "bruder": "brother", "schwester": "sister", "freund": "friend", "arbeit": "work",
    "schule": "school", "universität": "university", "stadt": "city", "land": "country",
    "welt": "world", "leben": "life", "tod": "death", "hand": "head", "fuß": "foot",
    "auge": "eye", "ohr": "ear", "mund": "mouth", "name": "name", "wort": "word",
    "satz": "sentence", "buch": "book", "tisch": "table", "stuhl": "chair", "fenster": "window",
    "tür": "door", "raum": "room", "wasser": "water", "brot": "bread", "milch": "milk",
    "fleisch": "meat", "apfel": "apple", "rot": "red", "blau": "blue", "grün": "green",
    "gelb": "yellow", "schwarz": "black", "weiß": "white", "braun": "brown",
}


def detect_compound(word):
    word_lower = word.lower()
    for compound, (part1, part2) in COMPOUND_PATTERNS.items():
        if compound.lower() == word_lower:
            return [part1, part2]
    if len(word) > 8:
        for i in range(4, len(word) - 3):
            if word[i].isupper() or (word[i-1].islower() and word[i].isupper()):
                return [word[:i], word[i:]]
    return None


def analyze_word_order(tokens):
    issues = []
    main_verb_pos = None
    verb_cluster = []
    
    for i, t in enumerate(tokens):
        if t["pos"] == "VERB" and t["dep"] == "ROOT":
            main_verb_pos = i
        if t["pos"] in ("VERB", "AUX"):
            verb_cluster.append(t["text"])
    
    if main_verb_pos:
        remaining = tokens[main_verb_pos + 1:]
        if remaining:
            verbs = [t for t in remaining if t["pos"] in ("VERB", "AUX")]
            if verbs:
                issues.append({
                    "type": "verb-last",
                    "message": f"Verb-last: '{' '.join([v['text'] for v in verbs])}' at end (normal for subordinate clauses)"
                })
    
    for i, t in enumerate(tokens):
        if t["dep"] == "punct" and t["text"] == ",":
            if i > 0 and i < len(tokens) - 1:
                issues.append({
                    "type": "comma",
                    "message": "Comma typically separates clauses or parenthetical phrases"
                })
    
    if tokens and tokens[0]["dep"] not in ("ROOT", "nsubj", "advcl") and tokens[0]["pos"] != "PROPN":
        issues.append({
            "type": "v2",
            "message": f"V2 rule: '{tokens[0]['text']}' in first position - verb should be second"
        })
    
    return issues


def generate_grammar_hints(tokens):
    hints = []
    
    for t in tokens:
        if t["pos"] == "NOUN" and t.get("article"):
            article = t["article"]
            case = t.get("case", [""])[0] if t.get("case") else ""
            if case:
                hints.append({
                    "word": t["text"],
                    "hint": f"'{t['text']}' is in {case.lower()} case (after '{article}')"
                })
        
        if t["pos"] == "VERB" and t.get("lemma") in CONJUGATIONS:
            hints.append({
                "word": t["text"],
                "hint": f"'{t['text']}' is a verb - see conjugation panel below"
            })
        
        if t["pos"] == "ADJ":
            hints.append({
                "word": t["text"],
                "hint": f"'{t['text']}' is an adjective - adjectives typically come before nouns"
            })
        
        if t["dep"] == "dobj":
            hints.append({
                "word": t["text"],
                "hint": f"'{t['text']}' is a direct object - usually in accusative case"
            })
        
        if t["dep"] == "iobj":
            hints.append({
                "word": t["text"],
                "hint": f"'{t['text']}' is an indirect object - usually in dative case"
            })
    
    for i, t in enumerate(tokens):
        if t["pos"] == "ADP" and i + 1 < len(tokens):
            next_token = tokens[i + 1]
            if next_token.get("case"):
                case = next_token["case"][0] if next_token["case"] else ""
                hints.append({
                    "word": t["text"],
                    "hint": f"Preposition '{t['text']}' governs {case.lower()} case"
                })
    
    return hints[:5]


async def analyze_text_spacy(text: str):
    def process():
        doc = nlp(text)
        result = []
        
        articles = {}
        for token in doc:
            if token.pos_ == "DET":
                articles[token.head.i] = token.text
        
        for token in doc:
            case_info = token.morph.get("Case", [])
            word_lower = token.text.lower()
            translation = WORD_TRANSLATIONS.get(word_lower, "")
            if not translation and token.lemma_:
                translation = WORD_TRANSLATIONS.get(token.lemma_.lower(), "")
            result.append({
                "text": token.text,
                "pos": token.pos_,
                "dep": token.dep_,
                "lemma": token.lemma_,
                "morph": token.morph.to_dict(),
                "case": case_info,
                "head": token.head.text,
                "head_dep": token.head.dep_,
                "article": articles.get(token.i, ""),
                "is_compound": detect_compound(token.text),
                "translation": translation
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


def get_verb_conjugation(lemma):
    if lemma in CONJUGATIONS:
        return CONJUGATIONS[lemma]
    
    for key in CONJUGATIONS:
        if lemma.startswith(key) or key.startswith(lemma[:4]):
            return CONJUGATIONS[key]
    
    return None


@app.post("/analyze")
async def analyze(req: TextRequest):
    translation_task = translate(req.text)
    spacy_task = analyze_text_spacy(req.text)
    
    translation, tokens = await asyncio.gather(
        translation_task,
        spacy_task
    )
    
    conjugations = {}
    for t in tokens:
        lemma = t["lemma"]
        if t["pos"] == "VERB" and lemma not in conjugations:
            conj = get_verb_conjugation(lemma)
            if conj:
                conjugations[lemma] = conj
    
    grammar_hints = generate_grammar_hints(tokens)
    word_order_issues = analyze_word_order(tokens)
    
    noun_genders = {}
    for t in tokens:
        if t["pos"] == "NOUN":
            morph = t.get("morph", {})
            gender = morph.get("Gender", [""])[0] if morph.get("Gender") else ""
            if gender:
                noun_genders[t["text"]] = {"gender": gender, "lemma": t["lemma"]}
    
    return {
        "original": req.text,
        "translation": translation,
        "tokens": tokens,
        "conjugations": conjugations,
        "grammar_hints": grammar_hints,
        "word_order_issues": word_order_issues,
        "noun_genders": noun_genders
    }
