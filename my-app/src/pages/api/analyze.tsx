import { IncomingForm, Fields, Files } from "formidable";
import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

const parseForm = (req: NextApiRequest): Promise<{ fields: Fields; files: Files }> =>
  new Promise((resolve, reject) => {
    const form = new IncomingForm({ keepExtensions: true });
    form.parse(req, (err, fields: Fields, files: Files) => {
      if (err) {
        console.error("Error parsing the form:", err);
        return reject(err);
      }
      console.log("Form parsed successfully:", { fields, files });
      resolve({ fields, files });
    });
  });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Received request:", { method: req.method, url: req.url });

  if (req.method !== "POST") {
    console.log("Invalid request method:", req.method);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { fields, files } = await parseForm(req);
    console.log("Fields and files received:", { fields, files });

    let conversation = fields.conversation 
      ? JSON.parse(Array.isArray(fields.conversation) ? fields.conversation[0] : fields.conversation as string) 
      : [];

    let imageUrl: string | null = null;
    if (files.image) {
      const file = Array.isArray(files.image) ? files.image[0] : files.image;
      const tempPath = (file as any).filepath;
      console.log("Handling image upload:", { originalFilename: file.originalFilename, tempPath });

      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        console.log("Creating uploads directory:", uploadsDir);
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileExt = path.extname(file.originalFilename || ".jpg");
      const fileName = `upload-${Date.now()}${fileExt}`;
      const destPath = path.join(uploadsDir, fileName);

      fs.copyFileSync(tempPath, destPath); // First, copy the file
      fs.unlinkSync(tempPath);             // Then, delete the original file

      const protocol = req.headers["x-forwarded-proto"] || "http";
      const host = req.headers.host;
      imageUrl = `${protocol}://ctbot.aiiot.center/uploads/${fileName}`;
      console.log("Image URL generated:", imageUrl);

      conversation.push({
        role: 'user', 
        content: `Here is the radiology image for analysis: ${imageUrl} if its not health related image dont analyze it`, 
        detail: "high"
      });
    }
    // Keep only the last two messages for context
    const lastTwoMessages = conversation.slice(-2);

    const openaiModule = require("openai");
    const { Configuration, OpenAIApi } = openaiModule.default || openaiModule;
    const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    const openai = new OpenAIApi(configuration);

    const response = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: lastTwoMessages,
      max_tokens: 300,
    });

    console.log("Received response from OpenAI:", response.data);
    res.status(200).json({ result: response.data.choices[0].message?.content || "No response from AI.", imageUrl });
  } catch (error: any) {
    console.error("Error in API handler:", error);
    res.status(500).json({ error: "Error processing request", details: error.response?.data || error.message || error });
  }
}
