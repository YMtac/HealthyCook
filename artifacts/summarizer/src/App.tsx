import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ClipboardPaste, RotateCcw, Clock, BookOpen,
  ChevronRight, CheckCircle2, Tag, TrendingUp, TrendingDown,
  Minus, AlertCircle, Moon, Sun, Copy, Check
} from "lucide-react";

type SentimentType = "positive" | "neutral" | "negative";

interface SummaryResult {
  title: string;
  summary: string;
  keyPoints: string[];
  sentiment: SentimentType;
  topics: string[];
  wordCount: number;
  readTime: number;
  text: string;
  timestamp: Date;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function summarize(text: string): Promise<SummaryResult> {
  const res = await fetch(`${BASE}/api/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }
  const data = await res.json();
  return { ...data, text, timestamp: new Date() };
}

function SentimentBadge({ sentiment }: { sentiment: SentimentType }) {
  const map = {
    positive: {
      icon: <TrendingUp size={13} />,
      label: "Positive",
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
    neutral: {
      icon: <Minus size={13} />,
      label: "Neutral",
      cls: "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300",
    },
    negative: {
      icon: <TrendingDown size={13} />,
      label: "Negative",
      cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    },
  }[sentiment];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${map.cls}`}>
      {map.icon} {map.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      data-testid="button-copy"
      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title="Copy summary"
    >
      {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
    </button>
  );
}

function ResultCard({ result, onReset }: { result: SummaryResult; onReset: () => void }) {
  const summaryText = `${result.title}\n\n${result.summary}\n\nKey Points:\n${result.keyPoints.map(p => `• ${p}`).join("\n")}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      {/* Header bar */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2
            data-testid="text-article-title"
            className="text-xl font-semibold text-foreground leading-snug"
          >
            {result.title}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <SentimentBadge sentiment={result.sentiment} />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <BookOpen size={12} /> {result.wordCount.toLocaleString()} words
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock size={12} /> {result.readTime} min read
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <CopyButton text={summaryText} />
          <button
            onClick={onReset}
            data-testid="button-reset"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Summarize new article"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
        <p
          data-testid="text-summary"
          className="text-sm leading-relaxed text-foreground"
        >
          {result.summary}
        </p>
      </div>

      {/* Key Points */}
      {result.keyPoints.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Key Points
          </h3>
          <ul className="space-y-2.5">
            {result.keyPoints.map((point, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
                data-testid={`text-keypoint-${i}`}
                className="flex items-start gap-2.5 text-sm text-foreground"
              >
                <CheckCircle2
                  size={15}
                  className="text-primary mt-0.5 flex-shrink-0"
                />
                <span>{point}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Topics */}
      {result.topics.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <Tag size={13} className="text-muted-foreground" />
          {result.topics.map((topic) => (
            <span
              key={topic}
              data-testid={`tag-topic-${topic}`}
              className="px-2.5 py-1 bg-accent text-accent-foreground text-xs rounded-full font-medium"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <div className="h-6 w-2/3 bg-muted rounded-lg animate-pulse" />
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
          <div className="h-5 w-24 bg-muted rounded-full animate-pulse" />
        </div>
      </div>
      <div className="bg-muted/40 rounded-xl p-4 space-y-2">
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
        <div className="h-4 w-4/6 bg-muted rounded animate-pulse" />
      </div>
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="h-3 w-20 bg-muted rounded animate-pulse" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-2.5">
            <div className="h-4 w-4 bg-muted rounded-full animate-pulse flex-shrink-0 mt-0.5" />
            <div className="h-4 bg-muted rounded animate-pulse flex-1" style={{ width: `${70 + i * 10}%` }} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [history, setHistory] = useState<SummaryResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleDark = () => {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await summarize(text);
      setResult(r);
      setHistory((h) => [r, ...h.slice(0, 9)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      setText(t);
      textareaRef.current?.focus();
    } catch {
      textareaRef.current?.focus();
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setText("");
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const charCount = text.length;
  const wordEst = text.trim() ? text.trim().split(/\s+/).length : 0;
  const canSubmit = charCount >= 50 && charCount <= 50000 && !loading;

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Top nav */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles size={14} className="text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground text-sm tracking-tight">
              Article Summarizer
            </span>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory((s) => !s)}
                data-testid="button-history"
                className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                History ({history.length})
              </button>
            )}
            <button
              onClick={toggleDark}
              data-testid="button-dark-mode"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* History panel */}
        <AnimatePresence>
          {showHistory && history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Recent summaries
                </h3>
                {history.map((h, i) => (
                  <button
                    key={i}
                    data-testid={`button-history-item-${i}`}
                    onClick={() => {
                      setResult(h);
                      setText(h.text);
                      setError(null);
                      setShowHistory(false);
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <span className="flex-1 text-sm text-foreground truncate">{h.title}</span>
                    <ChevronRight size={13} className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input card */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 pb-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Paste article text</span>
            <button
              onClick={handlePaste}
              data-testid="button-paste"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ClipboardPaste size={13} />
              Paste from clipboard
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            data-testid="input-article-text"
            placeholder="Paste or type the article text you want to summarize…"
            className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed"
            rows={9}
          />
          <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span data-testid="text-char-count">
                {charCount.toLocaleString()} / 50,000 chars
              </span>
              {wordEst > 0 && (
                <span data-testid="text-word-estimate">~{wordEst.toLocaleString()} words</span>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              data-testid="button-summarize"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                  />
                  Summarizing…
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Summarize
                </>
              )}
            </button>
          </div>
        </div>

        {/* Character limit warning */}
        <AnimatePresence>
          {charCount > 50000 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3"
            >
              <AlertCircle size={15} />
              Text exceeds the 50,000 character limit. Please shorten your input.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              data-testid="text-error"
              className="flex items-start gap-2.5 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3"
            >
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence mode="wait">
          {loading && <LoadingSkeleton key="loading" />}
          {result && !loading && (
            <ResultCard key="result" result={result} onReset={handleReset} />
          )}
        </AnimatePresence>

        {/* Empty state hint */}
        <AnimatePresence>
          {!result && !loading && !error && charCount === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 space-y-2"
            >
              <p className="text-sm text-muted-foreground">
                Paste any article, blog post, or long-form text above.
              </p>
              <p className="text-xs text-muted-foreground/70">
                Powered by GPT-4o mini · Up to 50,000 characters
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
