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
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { fields, files } = await parseForm(req);
    const conversationStr = fields.conversation ? (Array.isArray(fields.conversation) ? fields.conversation[0] : fields.conversation) : "[]";
    const conversation = JSON.parse(conversationStr) as Array<{ role: string; content: string }>;

    let imageUrl: string | null = null;
    if (files.image) {
      const file = Array.isArray(files.image) ? files.image[0] : files.image;
      const tempPath = (file as any).filepath || (file as any).path;

      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      const fileExt = path.extname(file.originalFilename || "image.jpg");
      const fileName = `upload-${Date.now()}${fileExt}`;
      const destPath = path.join(uploadsDir, fileName);
      fs.renameSync(tempPath, destPath);

      const protocol = req.headers["x-forwarded-proto"] || "http";
      const host = req.headers.host;
      imageUrl = `${protocol}://${host}/uploads/${fileName}`;
    }

    if (imageUrl) {
      conversation.push({ role: "user", content: `Here is the uploaded radiology image: ${imageUrl}` });
    }

    const openaiModule = require("openai");
    const { Configuration, OpenAIApi } = openaiModule.default || openaiModule;
    const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    const openai = new OpenAIApi(configuration);

    const response = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: conversation.map((msg) => ({ role: msg.role, content: msg.content })),
      max_tokens: 300,
    });

    res.status(200).json({ result: response.data.choices[0].message?.content || "No response from AI." });
  } catch (error: any) {
    res.status(500).json({ error: "Error processing request", details: error.response?.data || error.message || error });
  }
}
