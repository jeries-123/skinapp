import React, { useState } from "react";
import { FaPaperclip, FaPaperPlane } from "react-icons/fa";
import styles from "../styles/chatbot.module.css";

// TypeScript Interface for messages
interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string; // Optional Image Property for URLs
}

const Chatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Welcome to ProfDux Radiology! Upload an image or type a question about radiology and health.",
    },
  ]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const predefinedMessages = [
    "Analyze this image",
    "Create a radiology report",
    "What is your diagnosis?",
  ];

  // Handle File Upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  // Send Message (Handles Text and Image)
  const sendMessage = async (message: string, isPredefined = false) => {
    if (!message.trim() && !selectedImage) return;

    setLoading(true);
    const newUserMessage: Message = { role: "user", content: message }; // Start without image
    setMessages([...messages, newUserMessage]);

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

    const formData = new FormData();
    formData.append("message", message);
    formData.append("conversation", JSON.stringify([...messages, newUserMessage]));

    if (selectedImage) {
      formData.append("image", selectedImage);
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      setMessages((prev) => [
        ...prev.slice(0, -1), // Remove last user message
        { ...newUserMessage, image: data.imageUrl }, // Update last user message with URL
        { role: "assistant", content: data.result || "No response from AI." }, // Add assistant response
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
    setLoading(false);
  };

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.topLogoContainer}>
        <img src="https://dux.aiiot.center/_next/image?url=%2Fassets%2Fimages%2Frcaiot-logo.png&w=384&q=75" alt="ProfDux Logo" className={styles.topLogo} />
      </div>
      <div className={styles.chatbotPage}>
        <div className={styles.chatbotContainer}>
          <header className={styles.chatbotHeader}>
            <img src="https://dux.aiiot.center/assets/gif/DuxProHiddleGood.gif" alt="ProfDux Logo" className={styles.chatbotLogo} />
            <h1 className={styles.chatbotTitle}>ProfDux Radiology</h1>
          </header>
          <div className={styles.chatWindow}>
            {messages.map((msg, index) => (
              <div key={index} className={`${styles.message} ${msg.role === "user" ? styles.user : styles.assistant}`}>
                <img src={msg.role === "user" ? "https://icon-library.com/images/icon-for-person/icon-for-person-26.jpg" : "https://dux.aiiot.center/assets/gif/DuxProHiddleGood.gif"} alt={msg.role} className={styles.avatar} />
                <div className={styles.messageContent}>
                  {msg.image && (
                    <img src={msg.image} alt="Uploaded Preview" className={styles.uploadedImage} />
                  )}
                  <p>{msg.content}</p>
                </div>
              </div>
            ))}
            <div className={styles.predefinedMessages}>
              {predefinedMessages.map((msg, index) => (
                <button key={index} onClick={() => sendMessage(msg, true)} className={styles.predefinedMessageButton}>
                  {msg}
                </button>
              ))}
            </div>
          </div>
          <form onSubmit={handleSubmit} className={styles.chatForm}>
            <div className={styles.inputRow}>
              <label htmlFor="file-upload" className={styles.attachIcon}>
                <FaPaperclip />
              </label>
              <input id="file-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
              <input type="text" placeholder="Ask about radiology or health..." value={input} onChange={(e) => setInput(e.target.value)} className={styles.textInput} />
              <button type="submit" disabled={loading} className={styles.sendButton}>
                {loading ? "..." : <FaPaperPlane />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
