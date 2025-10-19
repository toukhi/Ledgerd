import { useEffect, useRef, useState } from "react";

type Message = {
  id: number;
  sender: "user" | "bot";
  text: string;
};

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const idRef = useRef(1);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      // focus input when opening
      setTimeout(() => {
        const el = document.getElementById("chat-input") as HTMLInputElement | null;
        el?.focus();
      }, 100);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function addMessage(sender: "user" | "bot", text: string) {
    setMessages((m) => [...m, { id: idRef.current++, sender, text }]);
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    addMessage("user", text);
    setInput("");

    // simple mock bot reply
    setTimeout(() => {
      addMessage("bot", `Echo: ${text}`);
    }, 500);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div>
      {/* Floating button */}
      <button
        aria-label={open ? "Close chat" : "Open chat"}
        onClick={() => setOpen((s) => !s)}
        className="fixed z-50 right-6 bottom-6 w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-indigo-500 shadow-lg flex items-center justify-center text-white ring-4 ring-white/20 hover:scale-105 transition-transform"
        title={open ? "Close chat" : "Open chat"}
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.8L3 20l.8-4A8.962 8.962 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed z-50 right-6 bottom-24 w-80 max-w-full bg-white/95 dark:bg-slate-900/95 rounded-xl shadow-2xl ring-1 ring-slate-900/5 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-indigo-500 flex items-center justify-center text-white font-medium">L</div>
              <div className="text-sm font-medium">Ledgerd Chat</div>
            </div>
            <div className="text-xs text-slate-500">AI • Offline demo</div>
          </div>

          <div className="px-3 py-3 flex-1 overflow-auto space-y-2 h-56">
            {messages.length === 0 && (
              <div className="text-sm text-slate-500">Hi! Ask me about the app or type anything to try the demo.</div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`px-3 py-2 rounded-lg max-w-[80%] ${m.sender === "user" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex gap-2">
              <input
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                className="flex-1 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none"
                placeholder="Type a message..."
                aria-label="Type a message"
              />
              <button onClick={handleSend} className="bg-slate-900 text-white px-3 py-2 rounded-md text-sm hover:opacity-90">Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
