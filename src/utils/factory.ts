import axios from "axios";
import bucket from "@/config/firebase";
import fs from "fs";
import path from "path";
import { getTextExtractor } from "office-text-extractor";
import { htmlToText } from "html-to-text";

// Query the configured LLM endpoint. This project previously used
// Google's Gemini API; we now call a DigitalOcean Gradient agent endpoint.
export const queryGemini = async (
  prompt: string,
): Promise<string | undefined> => {
  const endpoint = process.env.GRADIENT_AGENT_ENDPOINT;
  const accessKey = process.env.GRADIENT_AGENT_ACCESS_KEY;
  const token = process.env.GRADIENT_ACCESS_TOKEN;

  if (!endpoint) throw new Error("GRADIENT_AGENT_ENDPOINT not configured");
  if (!token) throw new Error("GRADIENT_ACCESS_TOKEN not configured");

  try {
    const payload = { input: prompt };

    const headers: any = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    if (accessKey) {
      headers["Gradient-Agent-Access-Key"] = accessKey;
      headers["x-gradient-access-key"] = accessKey;
    }

    const res = await axios.post(endpoint, payload, {
      headers,
      timeout: 60000,
    });

    const data = res.data;

    // Attempt to extract a readable text response from common fields
    if (!data) return undefined;

    if (typeof data === "string") return data;

    if (data.output && typeof data.output === "string") return data.output;

    if (data.output && Array.isArray(data.output) && data.output[0]?.content)
      return data.output[0].content;

    if (data.result && typeof data.result === "string") return data.result;

    if (data.response && typeof data.response === "string")
      return data.response;

    if (
      data.choices &&
      Array.isArray(data.choices) &&
      data.choices[0]?.message?.content
    )
      return data.choices[0].message.content;

    // Fallback: stringify the response
    return JSON.stringify(data);
  } catch (err: any) {
    console.error("Gradient agent call failed:", err?.message || err);
    throw err;
  }
};

export class LogBuilder {
  logs: string[] = [];
  title = "";
  constructor(title: string) {
    this.title = title;
    this.logs.push(`${new Date().toISOString()} [${title}]`);
  }
  append(title: string, body = "", type = "INFO") {
    this.logs.push(
      `${new Date().toISOString()} [${type} - ${title}]\n\n${body}`,
    );
  }
  getLogs() {
    return this.logs.join("\n");
  }
  async uploadLogs() {
    const fileName = this.title.replace(/[\_\.\-,]/g, "_");
    return uploadLog(fileName, this.getLogs(), fileName);
  }
}

export const isStage = (host: string) => {
  const stageDomain = [
    "https://sit.cvtocareer.com",
    "sit.cvtocareer.com",
    "https://iat.cvtocareer.com",
    "iat.cvtocareer.com",
    "https://uat.cvtocareer.com",
    "uat.cvtocareer.com",
    "http://localhost:3000",
    "localhost:3000",
  ];
  return stageDomain.includes(host);
};

export const uploadLog = async (
  filePath: string,
  content: string,
  logFileName: string,
) => {
  try {
    const logFilePath = path.join("/tmp", filePath);

    fs.writeFileSync(logFilePath, content, "utf8");

    const logUrl = await uploadFileToFirebase(logFilePath, logFileName);

    fs.unlinkSync(logFilePath);

    return logUrl;
  } catch (error) {
    console.error("Error in uploadLog:", error);
    throw error;
  }
};

export async function uploadFileToFirebase(
  logFilePath: string,
  logFileName: string,
) {
  try {
    const contentType = logFileName.endsWith(".docx")
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "text/plain";

    const uploadedFile = await bucket.upload(logFilePath, {
      destination: `${process.env.STORAGE_BUCKET}/${logFileName}`,
      metadata: {
        contentType: contentType,
      },
      resumable: true,
    });

    const publicUrl = await uploadedFile[0].getSignedUrl({
      action: "read",
      expires: "01-01-2099",
    });

    console.log("File uploaded to Firebase Storage:", publicUrl[0]);

    return publicUrl[0];
  } catch (error) {
    console.error("Error in uploadLog:", error);
    throw error;
  }
}

export function repairIncompleteJson(jsonString: string) {
  const fArr = jsonString.indexOf("[");
  const fObj = jsonString.indexOf("{");
  const sIndex = fArr < fObj ? fArr : fObj;

  const lastArr = jsonString.lastIndexOf(`],\n`);
  const lastObj = jsonString.lastIndexOf(`},\n`);
  const endIndx = lastArr > lastObj ? lastArr : lastObj;

  jsonString = jsonString.slice(sIndex, endIndx + 1);

  try {
    JSON.parse(jsonString);
    return jsonString;
  } catch {
    try {
      let cleaned = "";
      const tracker = [];

      for (const char of jsonString) {
        const last = tracker[tracker.length - 1];

        if (char === "[") tracker.push(char);
        else if (char === "{") tracker.push(char);
        else if (char === '"') {
          last === '"' ? tracker.pop() : tracker.push(char);
        } else if (char === "]" && last === "[") tracker.pop();
        else if (char === "}" && last === "{") tracker.pop();

        cleaned += char;
      }

      for (const char of tracker.reverse()) {
        if (char === "[") cleaned += "]\n";
        if (char === "{") cleaned += "}\n";
        if (char === '"') cleaned += '"\n';
      }

      JSON.parse(cleaned);
      return cleaned;
    } catch (repairError: any) {
      throw new Error(repairError.message);
    }
  }
}

export const extractResume = async (url: string) => {
  console.log({ fileUrl: url });
  const response = await axios.get(url, { responseType: "arraybuffer" });

  const buffer = Buffer.from(response.data);

  let fileType;
  try {
    const { fileTypeFromBuffer } = await import("file-type");
    fileType = await fileTypeFromBuffer(buffer);
  } catch (error) {
    console.log("Could not detect file type:", error);
  }

  let resumeText;

  try {
    if (fileType && fileType.mime === "application/x-cfb") {
      resumeText = buffer.toString().replace(/[^\x20-\x7E]/g, "");
    } else {
      const extractor = getTextExtractor();
      resumeText = await extractor.extractText({ input: url, type: "url" });
    }
  } catch (error) {
    console.log("Couldn't extract", error);
    return;
  }

  return resumeText;
};

export const extractPageContent = async (url: string): Promise<string> => {
  try {
    console.log(`Attempting to scrape URL: ${url}`);

    // Dynamic import to handle ESM module in CommonJS project
    const { gotScraping } = await import("got-scraping");

    const response = await gotScraping({
      url: url,
      timeout: { request: 15000 },
      retry: { limit: 2 },
    });

    console.log(`Successfully fetched HTML (Status: ${response.statusCode})`);

    const html = response.body;

    let pageContent = htmlToText(html, {
      wordwrap: false,
      selectors: [
        { selector: "script", format: "skip" },
        { selector: "style", format: "skip" },
        { selector: "a", options: { ignoreHref: true } },
        { selector: "img", format: "skip" },
      ],
    });

    pageContent = pageContent
      .replace(/(\r\n|\r|\n){3,}/g, "\n\n")
      .replace(/[ \t\f\v]+/g, " ")
      .trim();

    return pageContent;
  } catch (error: any) {
    console.error(`Error during scraping process for ${url}:`, error.message);
    if (error.response) {
      console.error(`Status Code: ${error.response.statusCode}`);
    } else if (error.request) {
      console.error("The request was made but no response was received.");
    }

    throw new Error(
      `Failed to extract page content from ${url}. Reason: ${error.message}`,
    );
  }
};