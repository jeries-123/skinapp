import React, { useState } from "react";
import { FaPaperclip, FaPaperPlane } from "react-icons/fa";
import styles from "../styles/chatbot.module.css";

/* ✅ Define TypeScript Interface */
interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string; /* ✅ Optional Image Property */
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Welcome to ProfDux Radiology! Upload an image or type a question about radiology and health.",
    },
  ]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const predefinedMessages = [
    "Analyze this image",
    "Create a radiology report",
    "What is your diagnosis?",
  ];

  // Handle File Upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Image selected:", e.target.files?.[0]);
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Send Message (Handles Text and Image)
  const sendMessage = async (message: string, isPredefined = false) => {
    if (!message.trim() && !selectedImage) return;

    setLoading(true);
    const newUserMessage: Message = { role: "user", content: message, image: preview || undefined };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);

    // Show loading indicator
    setMessages((prev) => [...prev, { role: "assistant", content: "loading..." }]);

    // If predefined message requires an image but none is attached
    if (isPredefined && !selectedImage) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "Please attach a radiology image to proceed with the analysis." },
        ]);
        setLoading(false);
      }, 1000);
      return;
    }

    // Keep only the last 2 messages for context
    const lastTwoMessages = updatedMessages.slice(-2);

    const formData = new FormData();
    formData.append("message", message);
    formData.append("conversation", JSON.stringify(lastTwoMessages));

    if (selectedImage) {
      formData.append("image", selectedImage);
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      // Remove loading message and add the response
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: data.result },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Error processing request." },
      ]);
    }

    setInput("");
    setSelectedImage(null);
    setPreview(null);
    setLoading(false);
  };

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className={styles.pageContainer}>
      {/* LOGO at the very top-left (outside chatbot) */}
      <div className={styles.topLogoContainer}>
        <img src="https://dux.aiiot.center/_next/image?url=%2Fassets%2Fimages%2Frcaiot-logo.png&w=384&q=75" alt="ProfDux Logo" className={styles.topLogo} />
      </div>

      <div className={styles.chatbotPage}>
        <div className={styles.chatbotContainer}>
          {/* Header with Logo inside Chatbot */}
          <header className={styles.chatbotHeader}>
            <img src="https://dux.aiiot.center/assets/gif/DuxProHiddleGood.gif" alt="ProfDux Logo" className={styles.chatbotLogo} />
            <h1 className={styles.chatbotTitle}>ProfDux Radiology</h1>
          </header>

          {/* Chat Window */}
          <div className={styles.chatWindow}>
            {messages.map((msg, index) => (
              <div key={index} className={`${styles.message} ${msg.role === "user" ? styles.user : styles.assistant}`}>
                <img src={msg.role === "user" ? "https://icon-library.com/images/icon-for-person/icon-for-person-26.jpg" : "https://dux.aiiot.center/assets/gif/DuxProHiddleGood.gif"} alt={msg.role} className={styles.avatar} />
                <div className={styles.messageContent}>
                  {msg.image && msg.role === "user" && (
                    <img src={msg.image} alt="Uploaded Preview" className={styles.uploadedImage} />
                  )}
                  {msg.content === "loading..." ? (
                    <div className={styles.typingIndicator}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Predefined Messages Inside Chat Window */}
            <div className={styles.predefinedMessages}>
              {predefinedMessages.map((msg, index) => (
                <button key={index} onClick={() => sendMessage(msg, true)} className={styles.predefinedMessageButton}>
                  {msg}
                </button>
              ))}
            </div>
          </div>

          {/* Input Row */}
          <form onSubmit={handleSubmit} className={styles.chatForm}>
            <div className={styles.inputRow}>
              {/* Attach Icon */}
              <label htmlFor="file-upload" className={styles.attachIcon}>
                <FaPaperclip />
              </label>
              <input id="file-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />

              {/* Text Input */}
              <input type="text" placeholder="Ask about radiology or health..." value={input} onChange={(e) => setInput(e.target.value)} className={styles.textInput} />

              {/* Send Button */}
              <button type="submit" disabled={loading} className={styles.sendButton}>
                {loading ? "..." : <FaPaperPlane />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
