import spacy
import requests

nlp = spacy.load("de_core_news_sm")
doc = nlp("Mein Name ist Joe und das ist Sarah und wir sind")

def _nlp(doc):
    for token in doc:
        print(
            f"Text: {token.text:10} "
            f"POS: {token.pos_:6} "
            f"Dep: {token.dep_:6} "
            f"Lemma: {token.lemma_:10} "
            f"Morph: {token.morph}"
        )

def translate(doc):
    url = "http://localhost:5000/translate"

    data = {
        "q": f"{doc}",
        "source": "de",
        "target": "en",
        "format": "text"
    }
    
    response = requests.post(url, json=data)
    
    print(response.json())

translate(doc)
_nlp(doc)
