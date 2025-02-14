import { IncomingForm, Fields, Files } from "formidable";
import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  }
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
    let imageUrl: string | null = null;
    let messages: any[] = [];

    if (files.image) {
      const file = files.image[0];
      const tempPath = file.filepath;
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const fileExt = path.extname(file.originalFilename || ".jpg");
      const fileName = `upload-${Date.now()}${fileExt}`;
      const destPath = path.join(uploadsDir, fileName);

      fs.copyFileSync(tempPath, destPath);
      fs.unlinkSync(tempPath);

      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['host'];
      imageUrl = `${protocol}://ctbot.aiiot.center/uploads/${fileName}`;
      console.log("Image uploaded successfully:", imageUrl);

      messages.push({
        role: "user",
        content: {
          type: "image_url",
          image_url: {
            url: imageUrl,
            detail: "high"
          }
        }
      });
    }

    const openai = require("openai");
    const { Configuration, OpenAIApi } = openai;
    const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    const client = new OpenAIApi(configuration);

    const response = await client.createChatCompletion({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 300
    });

    res.status(200).json({ result: response.data.choices[0].message?.content, imageUrl });
  } catch (error) {
    console.error("Error in API handler:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
}
