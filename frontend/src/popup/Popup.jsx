import { useEffect, useState } from "react";
import { analyzeText } from "../utils/api";
import "./Popup.css";

const POS_LABELS = {
  ADJ: "adjective",
  ADV: "adverb",
  AUX: "auxiliary",
  CCONJ: "coordinating conjunction",
  DET: "determiner",
  NOUN: "noun",
  NUM: "number",
  PART: "particle",
  PRON: "pronoun",
  PROPN: "proper noun",
  PUNCT: "punctuation",
  SCONJ: "subordinating conjunction",
  VERB: "verb",
  X: "other"
};

const DEP_LABELS = {
  ROOT: "root",
  acl: "adjective clause",
  advcl: "adverbial clause",
  advmod: "adverbial modifier",
  amod: "adjective modifier",
  appos: "appositive",
  attr: "attribute",
  aux: "auxiliary",
  auxpass: "passive auxiliary",
  case: "case marker",
  cc: "coordinating conjunction",
  ccomp: "clausal complement",
  compound: "compound",
  conj: "conjunct",
  cop: "copula",
  csubj: "clausal subject",
  det: "determiner",
  dobj: "direct object",
  iobj: "indirect object",
  mark: "marker",
  nmod: "nominal modifier",
  nsubj: "nominal subject",
  nsubjpass: "passive subject",
  nummod: "number modifier",
  obl: "oblique",
  parataxis: "parataxis",
  pobj: "prepositional object",
  prep: "preposition",
  punct: "punctuation",
  relcl: "relative clause",
  vocative: "vocative",
  xcomp: "open clausal complement"
};

const GENDER_LABELS = {
  Masc: "masculine (der)",
  Fem: "feminine (die)",
  Neut: "neuter (das)"
};

function speakGerman(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = 0.8;
  speechSynthesis.speak(utterance);
}

function TreeView({ tokens }) {
  const findRoot = () => tokens.find(t => t.dep === "ROOT");
  const root = findRoot();
  
  const getChildren = (headToken) => {
    return tokens.filter(t => t.head === headToken.text && t.text !== headToken.text);
  };
  
  const renderBranch = (token, level = 0, isLast = true) => {
    const children = getChildren(token);
    
    return (
      <div key={token.text + level} className="tree-node" style={{ marginLeft: level * 20 }}>
        <div className="tree-connector">
          {level > 0 && <span className="tree-line">{isLast ? "└─" : "├─"}</span>}
          <span className={`tree-word ${token.pos.toLowerCase()}`}>{token.text}</span>
          <span className="tree-dep">({token.dep})</span>
        </div>
        {children.map((child, idx) => renderBranch(child, level + 1, idx === children.length - 1))}
      </div>
    );
  };
  
  if (!root) return <div className="tree-placeholder">No structure detected</div>;
  
  return renderBranch(root);
}

function ConjugationPanel({ conjugations }) {
  if (!conjugations || Object.keys(conjugations).length === 0) return null;
  
  return (
    <section className="section">
      <label>Verb Conjugations</label>
      <div className="conjugations">
        {Object.entries(conjugations).map(([lemma, forms]) => (
          <div key={lemma} className="conj-block">
            <span className="conj-lemma">{lemma}</span>
            <div className="conj-grid">
              {Object.entries(forms).map(([pronoun, form]) => (
                <div key={pronoun} className="conj-item">
                  <span className="conj-pronoun">{pronoun}</span>
                  <span className="conj-form">{form}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function GrammarHints({ hints }) {
  if (!hints || hints.length === 0) return null;
  
  return (
    <section className="section">
      <label>Grammar Tips</label>
      <div className="hints">
        {hints.map((hint, i) => (
          <div key={i} className="hint-item">
            <span className="hint-word">"{hint.word}"</span>
            <span className="hint-text">{hint.hint}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function WordOrderAnalysis({ issues }) {
  if (!issues || issues.length === 0) return null;
  
  return (
    <section className="section">
      <label>Sentence Structure</label>
      <div className="word-order">
        {issues.map((issue, i) => (
          <div key={i} className={`issue-item ${issue.type}`}>
            <span className="issue-type">{issue.type.toUpperCase()}</span>
            <span className="issue-message">{issue.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function NounGenders({ nouns }) {
  if (!nouns || Object.keys(nouns).length === 0) return null;
  
  return (
    <section className="section">
      <label>Noun Genders</label>
      <div className="nouns">
        {Object.entries(nouns).map(([word, info]) => (
          <div key={word} className="noun-item">
            <span className="noun-word">{word}</span>
            <span className={`noun-gender ${info.gender.toLowerCase()}`}>
              {GENDER_LABELS[info.gender] || info.gender}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Popup() {
  const [text, setText] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState("breakdown");
  const [error, setError] = useState(null);

  useEffect(() => {
    const container = document.querySelector(".container");
    const preventSelect = (e) => {
      if (!e.target.closest(".action-btn")) {
        e.preventDefault();
      }
    };
    container.addEventListener("mousedown", preventSelect);
    return () => container.removeEventListener("mousedown", preventSelect);
  }, []);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_TEXT" }, async (res) => {
      if (!res?.text) return;

      setText(res.text);
      setLoading(true);
      setError(null);

      try {
        const result = await analyzeText(res.text);
        setData(result);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to analyze text");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  return (
    <div className="container">
      <header className="header">
        <div className="header-left">
          <h1>German Analyzer</h1>
        </div>
        <div className="header-actions">
          {data && (
            <button className="action-btn speak-btn" onClick={() => speakGerman(text)} title="Listen">
              🔊
            </button>
          )}
          <button className="action-btn help-btn" onClick={() => setShowHelp(!showHelp)}>?</button>
          <button className="action-btn close-btn" onClick={() => { window.getSelection()?.removeAllRanges(); window.close(); }} title="Close">×</button>
        </div>
      </header>

      <div className="content">
        {showHelp && (
          <div className="help-panel">
            <p><strong>How to use:</strong> Select any German text on a webpage, then click the extension icon.</p>
            <p><strong>Tabs:</strong> Switch between Word Breakdown, Tree View, and Analysis.</p>
            <p><strong>Audio:</strong> Click 🔊 to hear pronunciation.</p>
          </div>
        )}

        {data && (
          <section className="section">
            <label>German</label>
            <p className="original">{data.original}</p>
            <label className="label-translation">English</label>
            <div className="translation">{data.translation}</div>
          </section>
        )}

        {text && !data && (
          <section className="section">
            <label>German</label>
            <p className="original">{text}</p>
          </section>
        )}

        {!text && !loading && (
          <p className="no-text">Select German text on any webpage to analyze</p>
        )}

        {loading && <p className="loading">Analyzing...</p>}

        {error && <p className="error">{error}</p>}

        {data && (
          <>
            <div className="tabs">
              <button 
                className={`tab ${activeTab === "breakdown" ? "active" : ""}`}
                onClick={() => setActiveTab("breakdown")}
              >
                Words
              </button>
              <button 
                className={`tab ${activeTab === "tree" ? "active" : ""}`}
                onClick={() => setActiveTab("tree")}
              >
                Tree
              </button>
              <button 
                className={`tab ${activeTab === "analysis" ? "active" : ""}`}
                onClick={() => setActiveTab("analysis")}
              >
                Analysis
              </button>
            </div>

            {activeTab === "breakdown" && (
              <section className="section">
                <label>Word Breakdown</label>
                <div className="tokens">
                  {data.tokens.map((t, i) => (
                  <div key={i} className="token" title={`Lemma: ${t.lemma} | Head: ${t.head} (${t.head_dep})`}>
                    {t.translation && (
                      <span className="word-translation">{t.translation}</span>
                    )}
                    {t.is_compound ? (
                      <div className="compound">
                        <span className="word">{t.text}</span>
                        <span className="compound-parts">({t.is_compound.join(" + ")})</span>
                      </div>
                    ) : (
                      <span className="word">{t.text}</span>
                    )}
                    <span className="tag pos">{POS_LABELS[t.pos] || t.pos}</span>
                    {t.dep !== "punct" && (
                      <span className="tag dep">{DEP_LABELS[t.dep] || t.dep}</span>
                    )}
                    {t.case?.length > 0 && (
                      <span className="tag case">{t.case[0].toLowerCase()}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "tree" && (
            <section className="section">
              <label>Sentence Tree</label>
              <div className="tree-view">
                <TreeView tokens={data.tokens} />
              </div>
            </section>
          )}

          {activeTab === "analysis" && (
            <>
              <ConjugationPanel conjugations={data.conjugations} />
              <NounGenders nouns={data.noun_genders} />
              <GrammarHints hints={data.grammar_hints} />
              <WordOrderAnalysis issues={data.word_order_issues} />
            </>
          )}
        </>
        )}
      </div>
    </div>
  );
}
