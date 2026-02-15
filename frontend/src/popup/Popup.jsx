import { useEffect, useState } from "react";
import { analyzeText } from "../utils/api";
import "./Popup.css";

export default function Popup() {
  const [text, setText] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_TEXT" }, async (res) => {
      if (!res?.text) return;

      setText(res.text);
      setLoading(true);

      try {
        const result = await analyzeText(res.text);
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  return (
    <div className="container">
      <h1 className="title">German Analyzer</h1>

      {text && <p className="original">{text}</p>}

      {loading && <p className="loading">Analyzing...</p>}

      {data && (
        <>
          <div className="translation">
            {data.translation}
          </div>

          <div className="tokens">
            {data.tokens.map((t, i) => (
              <div key={i} className="token">
                <div className="word">{t.text}</div>
                <div className="info">
                  <span>{t.pos}</span>
                  <span>{t.dep}</span>
                  {t.case?.length > 0 && (
                    <span className="case">{t.case[0]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

