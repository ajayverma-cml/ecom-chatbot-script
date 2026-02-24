import axios from "axios";

const BASE_URL = "http://localhost:8000/api";
const N8N_URL = "https://n8n.crossml.in/webhook-test/e5a46886-b8b7-48d1-b097-c39ab1b9d0bf";


const FEATURES = {
    // Common adapters
    loadSession: async (session_id: string) =>{
        try{
            if (!session_id) return null;

            const url = `${BASE_URL}/sessions/${session_id}/history/`;
            const response = await axios.get(url);
            const data = response?.data;

            if (data?.status === "success"){
                return {
                    session_id: data?.data?.id,
                    customer_id: data?.data?.customer_id ?? null,
                    customer_name: data?.data?.customer_name ?? null,
                    customer_email: data?.data?.customer_email ?? null,
                    messages: data?.data?.messages ?? [],
                }
            }
            return null;
        }
        catch(error){
            console.error("Session loading error:", error);
            return null;
        }
    },
    createSession: async () =>{
        try{
            const url = `${BASE_URL}/sessions/create/`;
            const response = await axios.post(url);
            const data = response?.data;
            if (data?.status === "success"){
                return {
                    session_id: data?.data?.id,
                    customer_id: null,
                    customer_name: null,
                    customer_email: null,
                    messages: data?.data?.messages ?? [],
                }
            }
            return null;
        }
        catch(error){
            console.error("Session create error:", error);
            return null;
        }
    },
    saveMessage: async (session_id: string, message: string, role: string) =>{
        try{
            const msg = {
                "role": role,
                "message": message,
                "session": session_id,
            }

            const url = `${BASE_URL}/messages/create/`;
            const response = await axios.post(url, msg);
            const data = response?.data;
            if (data?.status === "success"){
                return data?.data
            }
            return null;
        }
        catch(error){
            console.error("Message save error:", error);
            return null;
        }
    },
    handelStreaming: async (response, onChunk)=>{
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) return;

        let partialBuffer = "";
        let accumulatedData: any = {};
        let finalResponse = "";
        let messageStr = "";
        let messageStrEnd = false;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            partialBuffer += chunk;

            // Process each JSON object chunk separated by newline
            const parts = partialBuffer.split("\n");

            // Last part may be incomplete → keep it for later
            partialBuffer = parts.pop();

            for (let part of parts) {
                part = part.trim();
                if (!part) continue;

                try {
                    const parsed = JSON.parse(part);

                    // Merge streamed fields
                    accumulatedData = {
                        ...accumulatedData,
                        ...parsed
                    };

                    if (accumulatedData?.type !== "item") continue;

                    const content = accumulatedData?.content?.replace('\"', '"') || "";
                    
                    // Collect full stream for final response
                    finalResponse += content;

                    let messageChunkStr = "";
                    // Only stream `message`
                    if (finalResponse.includes('"message": "') && !messageStrEnd) {
                        const idx = finalResponse.indexOf('"message": "') + '"message": "'.length;
                        let rest = finalResponse.slice(idx);

                        // Check if we have a closing brace
                        const endIdx = rest.includes('",') ? rest.indexOf('",') : rest.indexOf('"}');
                        if (endIdx !== -1) {
                            rest = rest.slice(0, endIdx).trim().replace(messageStr, "");
                            messageStr += rest;
                            messageChunkStr = rest;
                            messageStrEnd = true; // mark as finished
                        } else {
                            rest = rest.replace(messageStr, "");
                            messageStr += rest;
                            messageChunkStr = rest;
                        }
                        onChunk(messageChunkStr.replace(/\\n/g, "\n"));
                    }

                } catch (err) {
                    console.error("Stream parsing error::", err);
                }
            }
        }
    },

    // Shopify adapters
    shopify: {
        sendMessage: async (message: string, session_id: string, onChunk: (chunk: string) => void) =>{
            try{
                if (!message.trim() || !session_id) return null;

                const formData = new FormData();
                formData.append("message", message);

                const response = await fetch(N8N_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Session-Id": session_id,
                    },
                    body: JSON.stringify({ message }),
                });

                await FEATURES.handelStreaming(response, onChunk);
                return { success: true };
            }
            catch(error){
                console.error("Message sending error:", error);
                return { success: false, error: "Network error" };
            }
        }
    }
}

export default FEATURES;
