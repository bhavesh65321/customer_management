import { useState, useRef, useEffect, useCallback } from "react";
import api from "../../api";

const QUICK_CHIPS = [
  "How are my sales this month?",
  "How do I add a girvi loan?",
  "How does the barcode scanner work?",
  "How do I send WhatsApp reminders?",
  "How to create a bill?",
  "How to add a new customer?",
  "How to set today's gold rate?",
  "How to assign a repair to karigar?",
];

function renderMarkdown(text) {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split("\n").map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ));
  });
}

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Namaste! 🙏 I'm your **Jewellery Manager AI**.\n\nI can answer questions about your business or guide you through the app. What would you like to know?",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Drag state
  const [pos, setPos] = useState({ x: 16, y: null }); // x from left, y from bottom (null = default)
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef(null);

  // Convert bottom-anchored default position to absolute on first drag
  const getInitialRect = useCallback(() => {
    if (panelRef.current) return panelRef.current.getBoundingClientRect();
    return null;
  }, []);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    const rect = getInitialRect();
    if (!rect) return;
    dragging.current = true;
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, [getInitialRect]);

  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    const rect = getInitialRect();
    if (!rect) return;
    dragging.current = true;
    dragOffset.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }, [getInitialRect]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const panelW = panelRef.current ? panelRef.current.offsetWidth : 384;
      const panelH = panelRef.current ? panelRef.current.offsetHeight : 500;
      const newX = Math.min(Math.max(clientX - dragOffset.current.x, 0), vw - panelW);
      const newY = Math.min(Math.max(clientY - dragOffset.current.y, 0), vh - panelH);
      setPos({ x: newX, y: newY, fixed: true });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  async function sendMessage(text) {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput("");
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const { data } = await api.post("/ai/chat", { message: userMsg, history });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "Sorry, I couldn't understand that." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Unable to reach AI. Please check your connection." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Panel position style: use fixed coords if dragged, otherwise default bottom-right above feedback
  const panelStyle = pos.fixed
    ? { position: "fixed", left: pos.x, top: pos.y, bottom: "auto" }
    : { position: "fixed", right: "1.5rem", bottom: "8rem" };

  return (
    <>
      {/* Floating trigger button — sits above feedback widget (bottom-6 right-6) */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-6 z-50 w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg flex items-center justify-center text-2xl transition-all"
        title="AI Assistant"
        aria-label="Open AI Assistant"
      >
        🤖
      </button>

      {/* Draggable chat panel */}
      {open && (
        <div
          ref={panelRef}
          style={{ ...panelStyle, zIndex: 50, maxHeight: "70vh", width: "min(24rem, calc(100vw - 2rem))" }}
          className="bg-white rounded-2xl shadow-2xl flex flex-col border border-purple-100 overflow-hidden"
        >
          {/* Drag handle / Header */}
          <div
            className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <p className="font-semibold text-sm">Jewellery Manager AI</p>
                <p className="text-xs text-purple-200">Business advisor & product guide</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-300 text-xs select-none" title="Drag to move">⠿</span>
              <button
                onClick={() => setOpen(false)}
                onMouseDown={(e) => e.stopPropagation()}
                className="text-purple-200 hover:text-white text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50" style={{ minHeight: 200 }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white rounded-br-sm"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {renderMarkdown(msg.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm">
                  <span className="flex gap-1 items-center text-gray-400 text-xs">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.15s" }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.3s" }}>●</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick chips — shown when no user message yet */}
          {messages.filter(m => m.role === "user").length === 0 && (
            <div className="px-3 py-2 flex flex-wrap gap-1.5 border-t border-gray-100 bg-white">
              <p className="w-full text-xs text-gray-400 mb-1">Quick questions:</p>
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-1 hover:bg-purple-100 transition"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-100 bg-white px-3 py-2 flex gap-2">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask me anything…"
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              style={{ maxHeight: 80 }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl px-3 py-2 text-sm font-medium transition"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
