import OpenAI from "openai";
import { getEnvVariable } from "./env.js";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
const openai = new OpenAI({
    apiKey: getEnvVariable("OPENAI_APIKEY", ""),
    baseURL: getEnvVariable("OPENAI_BASEURL", ""),
});
export async function* createChatStream(messages, options) {
    const opId = options?.meta?.aiOperationId || options?.meta?.opId || "unknown";
    const requestId = options?.meta?.aiRequestId || options?.meta?.reqId || `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
    const startTs = Date.now();
    console.log("[ai] start", { requestId, opId, type: "stream" });
    const stream = await openai.chat.completions.create({
        model: getEnvVariable("OPENAI_MODEL_NAME", "gemini-2.5-pro-preview-03-25"),
        messages,
        stream: true,
        ...options,
    });
    let first = true;
    let ttftMs = null;
    let combined = "";
    let responseId;
    try {
        for await (const chunk of stream) {
            const chunkAny = chunk;
            if (!responseId && chunkAny?.id) {
                responseId = chunkAny.id;
            }
            const content = chunk.choices[0]?.delta?.content || "";
            if (first && content) {
                first = false;
                ttftMs = Date.now() - startTs;
                console.log("[ai] ttft", { requestId, opId, type: "stream", ttftMs });
            }
            if (content) {
                combined += content;
                yield content;
            }
        }
        const totalMs = Date.now() - startTs;
        console.log("[ai] complete", {
            requestId,
            opId,
            type: "stream",
            totalMs,
            ttftMs,
            tokensApprox: combined.length,
        });
        await writeAiLog({
            requestId,
            opId,
            modelName: getEnvVariable("OPENAI_MODEL_NAME", "gemini-2.5-pro-preview-03-25"),
            mode: "stream",
            messages,
            options,
            responseId,
            content: combined,
            ttftMs: ttftMs ?? undefined,
            totalMs,
        });
    }
    catch (error) {
        const totalMs = Date.now() - startTs;
        console.log("[ai] error", { requestId, opId, type: "stream", totalMs, error });
        throw error;
    }
}
export async function createChat(messages, options) {
    const opId = options?.meta?.aiOperationId || options?.meta?.opId || "unknown";
    const requestId = options?.meta?.aiRequestId || options?.meta?.reqId || `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
    const startTs = Date.now();
    const modelName = getEnvVariable("OPENAI_MODEL_NAME", "gemini-2.5-pro-preview-03-25");
    console.log("[ai] start", { requestId, opId });
    const doRequest = async (includeResponseFormat) => {
        const { meta, ...rest } = options || {};
        const requestOptions = includeResponseFormat
            ? rest
            : { ...rest, response_format: undefined };
        const response = await openai.chat.completions.create({
            model: modelName,
            messages,
            stream: false,
            ...requestOptions,
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("Received empty response from AI.");
        }
        return { content, responseId: response?.id };
    };
    try {
        const { content, responseId } = await doRequest(true);
        const totalMs = Date.now() - startTs;
        console.log("[ai] complete", {
            requestId,
            opId,
            type: "non-stream",
            totalMs,
            tokensApprox: content.length,
        });
        await writeAiLog({
            requestId,
            opId,
            modelName,
            mode: "non-stream",
            messages,
            options,
            responseId,
            content,
            totalMs,
        });
        return content;
    }
    catch (error) {
        // If provider rejects response_format, retry without it
        const status = typeof error === "object" && error ? error.status : undefined;
        const hadResponseFormat = Boolean(options?.response_format);
        if (status === 400 && hadResponseFormat) {
            console.warn("[ai] retrying without response_format due to 400", {
                requestId,
                opId,
            });
            try {
                const { content, responseId } = await doRequest(false);
                const totalMs = Date.now() - startTs;
                console.log("[ai] complete", {
                    requestId,
                    opId,
                    type: "non-stream",
                    totalMs,
                    tokensApprox: content.length,
                    note: "no response_format",
                });
                await writeAiLog({
                    requestId,
                    opId,
                    modelName,
                    mode: "non-stream",
                    messages,
                    options: { ...(options || {}), response_format: undefined },
                    responseId,
                    content,
                    totalMs,
                });
                return content;
            }
            catch (err2) {
                console.error("Error calling OpenAI createChat (no response_format):", err2);
                throw err2;
            }
        }
        console.error("Error calling OpenAI createChat:", error);
        throw error;
    }
}
export { openai };
// --- Friendly AI logging helper ---
async function writeAiLog(params) {
    try {
        const logsDir = path.join(process.cwd(), "logs", "ai");
        await mkdir(logsDir, { recursive: true });
        const now = new Date();
        const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
        const shortTs = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
        const fileId = params.responseId || params.requestId;
        const fileName = `${shortTs} - ${fileId}.log`;
        const filePath = path.join(logsDir, fileName);
        const header = [
            "==================== AI INTERACTION ====================",
            `Time        : ${now.toLocaleString()}`,
            `Operation   : ${params.opId}`,
            `Request ID  : ${params.requestId}`,
            `Mode        : ${params.mode}`,
            `Model       : ${params.modelName}`,
            params.responseId ? `OpenAI ID   : ${params.responseId}` : undefined,
            params.ttftMs !== undefined ? `TTFT        : ${params.ttftMs} ms` : undefined,
            params.totalMs !== undefined ? `Total Time  : ${params.totalMs} ms` : undefined,
        ]
            .filter(Boolean)
            .join("\n");
        const optionsPretty = (() => {
            const { meta, ...rest } = params.options || {};
            try {
                return JSON.stringify(rest, null, 2);
            }
            catch {
                return String(rest);
            }
        })();
        const messagesPretty = params.messages
            .map((m, idx) => {
            const body = truncate(typeof m.content === "string" ? m.content : JSON.stringify(m.content), 600);
            return `  ${idx + 1}. ${m.role}: ${body}`;
        })
            .join("\n");
        const contentPretty = params.content.trim();
        const friendly = [
            header,
            "---------------------------------------------------------",
            "Messages:",
            messagesPretty,
            "---------------------------------------------------------",
            "Options:",
            optionsPretty,
            "---------------------------------------------------------",
            "Assistant Content (full):",
            contentPretty,
            "========================================================="
        ].join("\n");
        await writeFile(filePath, friendly, { encoding: "utf8" });
    }
    catch (err) {
        // Best-effort logging; do not throw
        console.warn("[ai-log] Failed to write AI log:", err);
    }
}
function truncate(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.slice(0, maxLength) + ` ... [${text.length - maxLength} more chars]`;
}
