import axios from "axios";
import { defaultChatbotConfig } from "@/config/chatbot-config";

const BASE_URL = "http://localhost:8000/api";
const N8N_URL = "https://n8n.crossml.in/webhook/9c2f4e73-6a81-4d5b-9f2a-3e7c8b1d4a62";
const MAGENTO_BASE_URL = "https://edfeb27880.nxcli.net";
const AVAILABLE_AGENTS = {
    "product_search": "https://n8n.crossml.in/webhook/9c2f4e73-6a81-4d5b-9f2a-3e7c8b1d4a62",
    "cart_manage": "https://n8n.crossml.in/webhook/9da58654-22cd-4a85-b4c2-eea4e8e619ce",
    "order_manage": "https://n8n.crossml.in/webhook/6c6ceff4-8444-4c25-9e32-7c1e7538f703",
    "faq": "https://n8n.crossml.in/webhook/c2b54a39-4039-4101-93bc-a82bc68fa767",
};

const FEATURES = {
    // Common adapters
    // ** Load existing session **
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
    // ** Create new session (with optional customer data for Magento) **
    createSession: async (customer_name:string="", customer_email:string="", customer_id:string="") =>{
        try{
            let payload = null;
            let response = null;

            if (customer_name && customer_email && customer_id) {
                payload = {
                    customer_name,
                    customer_email,
                    customer_id
                }
            }

            const url = `${BASE_URL}/sessions/create/`;
            if (payload){
                response = await axios.post(url, payload);
            }
            else{
                response = await axios.post(url);
            }

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
            console.error("Session create error:", error);
            return null;
        }
    },
    // ** Save message to backend **
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
    // ** Save session metadata (e.g. cart data) to backend **
    saveMetadata: async (session_id: string, metadata: any) =>{
        try{
            const response = await axios.post(`${BASE_URL}/session-metadata/`, { "session_id": session_id, "data": metadata });
            const data = response?.data;
            if (data?.status === "success"){
                return true;
            }
            return false;
        }
        catch(error){
            console.error("Metadata save error:", error);
            return false;
        }
    },
    // ** Handle streaming response from backend **
    handelStreaming: async (response, onChunk: (chunk: string, agentCalling: boolean) => void)=>{
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) return;

        let partialBuffer = "";
        let finalResponse = "";
        let messageStr = "";
        let messageStrEnd = false;
        let agentCallDetected = false;
        let agentCallNameStr = "";
        const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

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
                await sleep(20);
                part = part.trim();
                if (!part) continue;

                try {
                    const parsed = JSON.parse(part);

                    if (parsed?.type !== "item") continue;
                    if (parsed?.metadata?.nodeName !== "AI Agent") continue;
                    // console.log(parsed?.metadata?.nodeName, "Parsed stream chunk:", parsed);

                    const content = parsed?.content?.replace('\"', '"') || "";

                    // Collect full stream for final response
                    finalResponse += content;

                    let messageChunkStr = "";

                    const possibleEndings = ['",', '}', '"}', '"\n}'];

                    // Only stream `message`
                    if (finalResponse.includes('"message": "') && !messageStrEnd) {
                        const idx = finalResponse.indexOf('"message": "') + '"message": "'.length;
                        let rest = finalResponse.slice(idx);

                        let endIdx = -1;
                        for (const delimiter of possibleEndings) {
                            const idx = rest.indexOf(delimiter);
                            if (idx !== -1) {
                                endIdx = idx;
                                break;
                            }
                        }
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
                        // console.log("messageChunkStr:", messageChunkStr);
                        onChunk(messageChunkStr.replace(/\\n/g, "\n"), false);
                    }

                    // Detect agent call required or not based on stream content (e.g. presence of specific keywords or fields). This allows the frontend to trigger agent actions in real-time as the relevant information is streamed from the backend.
                    if (finalResponse.includes('"agent": "') && !agentCallDetected) {
                        const idx = finalResponse.indexOf('"agent": "') + '"agent": "'.length;
                        let rest = finalResponse.slice(idx);

                        // Check if we have a closing brace
                        const endIdx = rest.includes('",') ? rest.indexOf('",') : rest.indexOf('"}');
                        if (endIdx !== -1) {
                            rest = rest.slice(0, endIdx).trim().replace(agentCallNameStr, "");
                            agentCallNameStr += rest;
                            agentCallDetected = true; // mark as detected
                        } else {
                            rest = rest.replace(agentCallNameStr, "");
                            agentCallNameStr += rest;
                        }
                    }
                } catch (err) {
                    console.error("Stream parsing error::", err);
                }
            }
        }

        return {"finalResponse": finalResponse, "messageStr": messageStr, "agentCallDetected": agentCallDetected, "agentCallName": agentCallNameStr};
    },
    // ** Utility to read cookie value by name **
    getCookie: (name: string) => {
        const value = document.cookie
            .split(";")
            .map(c => c.trim())
            .filter(c => c.startsWith(name + "="))[0] || null;
        if (value) return value?.split("=")[1];
    },
    // ** Call agent action by name with necessary parameters (e.g. session ID, message, cart ID) and handle streaming response for agent's reply. This function can be triggered when the frontend detects that an agent call is required based on the streamed content from the backend, allowing for dynamic interactions with agents in real-time. The onChunk callback is used to stream the agent's response back to the UI as it arrives.
    callAgent: async (agentName: string, session_id: string, message: string, onChunk: (chunk: string, agentCalling: boolean) => void) =>{
        try{
            if (!agentName || !session_id || !message) return null;

            if (!AVAILABLE_AGENTS[agentName]){
                console.error(`Agent "${agentName}" is not available.`);
                onChunk(`Error: The agent "${agentName}" is currently unavailable. Please try again later or contact support.`, false);
                return null;
            }

            const cartID = localStorage.getItem("chatbot_cart_id");

            const formData = new FormData();
            formData.append("message", message);
            const headers = {
                "Content-Type": "application/json",
                "X-Session-Id": session_id,
            };

            if (agentName === "cart_manage" && defaultChatbotConfig?.features?.platformName === "shopify"){
                headers["X-Cart-Id"] = cartID || "";
            };

            const response = await fetch(AVAILABLE_AGENTS[agentName], {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ message }),
            });

            const streamResponse = await FEATURES.handelStreaming(response, onChunk);
            return streamResponse;
        }
        catch(error){
            console.error(`Agent "${agentName}" call error: `, error);
        }
    },
    // ** Submit user feedback for a session with rating and helpfulness. This allows the frontend to send user feedback to the backend for analysis and improvement of the chatbot's performance. The rating can be used to gauge overall satisfaction, while the is_helpful flag provides more specific insight into whether the response was useful for solving the user's issue. The function returns a success status or an error message based on the outcome of the submission.
    feedbackSubmit: async (session_id: string, rating: 1 | 2| 3, is_helpful: boolean=null, comment: string=null) =>{
        try{
            // rating: 1 - bad, 2 - neutral, 3 - excellent. is_helpful: whether the response is helpful for solving the user's issue, true/false/null (null means not specified)
            const payload = {
                rating: rating,
                session: session_id,
            };

            if (is_helpful !== null){
                payload["is_helpful"] = is_helpful;
            }

            if (comment !== null && comment !== ""){
                payload["comment"] = comment;
            }

            const url = `${BASE_URL}/feedbacks/create/`;
            const response = await axios.post(url, payload);
            const data = response?.data;
            if (data?.status === "success"){
                return { success: true };
            }
            return { success: false, error: "Failed to submit feedback" };
        }
        catch(error){
            console.error("Feedback submission error:", error);
            return { success: false, error: "Network error" };
        }
    },

    // Shopify adapters
    shopify: {
        // For Shopify, we can directly use the common sendMessage function since it doesn't require special headers or handling for cart actions in this implementation. However, we keep this structure for consistency and future extensibility.
        sendMessage: async (message: string, session_id: string, onChunk: (chunk: string, agentCalling: boolean) => void) =>{
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

                const streamResponse = await FEATURES.handelStreaming(response, onChunk);
                let responseMessage = streamResponse?.messageStr || "";

                if (streamResponse && streamResponse.agentCallDetected) {
                    // Show a message to user while calling an agent so they know something is happening
                    onChunk("", true);
                    const agentResponse = await FEATURES.callAgent(streamResponse.agentCallName, session_id, message, onChunk);
                    responseMessage = agentResponse?.messageStr
                    if (!agentResponse || !agentResponse.finalResponse) {
                        return { success: false, error: "Agent response error" };
                    }
                }
                return { success: responseMessage ? true : false };
            }
            catch(error){
                console.error("Message sending error:", error);
                return { success: false, error: "Network error" };
            }
        }
    },

    // magento adapters
    magento: {
        // Magento requires additional headers and handling for cart actions, so we implement a custom sendMessage function here. The handleCartAction function will manage add/update/remove/view cart operations by making appropriate API calls to Magento endpoints.
        sendMessage: async (message: string, session_id: string, onChunk: (chunk: string) => void) =>{
            try{
                if (!message.trim() || !session_id) return null;

                const formData = new FormData();
                formData.append("message", message);

                const storeCode = FEATURES.magento.fetchStoreCode();
                if (!storeCode){
                    console.error("Store code not found in Magento");
                    onChunk("Error: Configuration issue. Please contact support.");
                    return { success: false, error: "Store code not found" };
                };

                const response = await fetch(N8N_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Session-Id": session_id,
                        "Store-Code": storeCode,
                    },
                    body: JSON.stringify({ message }),
                });

                const streamResponse = await FEATURES.handelStreaming(response, onChunk);
                if (streamResponse){
                    try{
                        const streamData = JSON.parse(streamResponse.finalResponse);
                        const jsonContent = streamData?.output?.json_content;

                        // Perform cart actions for guest users based on streamed JSON content. This allows the chatbot to update the cart in real-time as the user interacts with it, providing a seamless shopping experience.
                        if (jsonContent && jsonContent.cartAction && jsonContent.payload){
                            const cartResult = await FEATURES.magento.handleCartAction(jsonContent.cartAction, jsonContent.payload);
                            if (cartResult?.success){
                                onChunk(`\n\n${cartResult?.message}` || "\n\nCart updated successfully.");
                                if (cartResult?.metadata){
                                    const metadataSaved = await FEATURES.saveMetadata(session_id, cartResult.metadata);
                                    if (!metadataSaved){
                                        console.error("Failed to save cart metadata to backend");
                                    }
                                }
                            }
                            else{
                                onChunk(cartResult?.message || "\n\nI’m having a little trouble with your cart right now. Please try again shortly.");
                            }
                            
                        }

                        // Refresh cart data in frontend if login user updates cart (detected by keywords in the stream response). This ensures that the cart displayed to the user is always up-to-date with their latest actions.
                        const cartKeywords = [" go to checkout", " added", " removed", " updated"];
                        if (cartKeywords.some(keyword => JSON.stringify(streamResponse).includes(keyword))) {
                            FEATURES.magento.refreshCart();
                        }
                    }
                    catch(err){
                        console.error("Error parsing full stream response:", err);
                    }
                }

                return { success: true };
            }
            catch(error){
                console.error("Message sending error:", error);
                return { success: false, error: "Network error" };
            }
        },
        // Cart action handler for Magento - manages add/update/remove/view cart operations by making API calls to Magento endpoints. It constructs the appropriate URL and payload based on the action type and uses the form key for authentication.
        handleCartAction: async (action: "add" | "update" | "remove" | "view", payload: any) =>{
            try{
                if (!action || !payload) return null;

                let url = "";
                const formData = new FormData();
                const form_key = FEATURES.getCookie("form_key");
                formData.append("form_key", form_key);
                let metadata = null;

                const storeCode = FEATURES.magento.fetchStoreCode();
                if (!storeCode){
                    console.error("Store code not found in Magento");
                    return {"success": false, "message": "I’m having a little trouble right now. Please refresh the page and try again."};
                };

                if (action === "add"){
                    if (!payload?.product_id || !payload?.quantity){
                        console.error("Invalid payload for add to cart:", payload);
                        return {"success": false, "message": "I couldn’t add that item just now. Please try again?."};
                    }

                    url = `${MAGENTO_BASE_URL}/${storeCode}/amasty_cart/cart/add/`;
                    formData.append("product", payload.product_id);
                    formData.append("qty", payload.quantity);
                    metadata = {
                        "addedProduct": {
                            "product_id": payload.product_id,
                            "quantity": payload.quantity,
                            "product_name": payload.product_name,
                            "product_price": payload.product_price,
                        }
                    }
                }
                else if (action === "update"){
                    const itemID = FEATURES.magento.fetchCartItemId(payload.product_id);
                    if (!itemID || !payload?.quantity){
                        console.error("Invalid payload for update cart:", payload);
                        return {"success": false, "message": "I wasn’t able to update that item right now. Please try again. If the issue persists, refreshing the page might help."};
                    }

                    url = `${MAGENTO_BASE_URL}/${storeCode}/amasty_cart/cart/UpdateItemOptions/`;
                    formData.append("id", itemID);
                    formData.append("qty", payload.quantity);
                    metadata = {
                        "updatedProduct": {
                            "product_id": payload.product_id,
                            "quantity": payload.quantity,
                            "product_name": payload.product_name,
                            "product_price": payload.product_price,
                        }
                    }
                }
                else if (action === "remove"){
                    const itemID = FEATURES.magento.fetchCartItemId(payload.product_id);
                    if (!itemID){
                        console.error("Invalid payload for remove from cart:", payload);
                        return {"success": false, "message": "I couldn’t remove that item just now. Please try again. If the issue persists, refreshing the page might help."};
                    }

                    url = `${MAGENTO_BASE_URL}/${storeCode}/checkout/sidebar/removeItem/`;
                    formData.append("id", itemID);
                    metadata = {
                        "removedProduct": {
                            "product_id": payload.product_id,
                            "product_name": payload.product_name,
                            "product_price": payload.product_price,
                        }
                    }
                }
                else if (action === "view"){
                    const jsonCartData = JSON.parse(localStorage.getItem("mage-cache-storage"))?.cart;
                    if (!jsonCartData || jsonCartData?.items?.length === 0) {
                        return {"success": true, "message": "Your cart is empty right now. Feel free to browse and add something you like 😊"}
                    }

                    const cartData = {"items": [], "subTotal": ""};

                    jsonCartData?.items?.forEach((item: any) => {
                        cartData["items"].push({
                            product_id: item.product_id,
                            name: item.product_name,
                            price: `€${item.product_price_value}`,
                            quantity: item.qty,
                        });
                    });

                    cartData["subTotal"] = `€${jsonCartData?.subtotalAmount}`;

                    const cartItems = jsonCartData.items
                            .map(
                            (item: any, index: number) =>
                                `**${index + 1}. ${item.product_name}**  
                    Price: €${item.product_price_value}  
                    Quantity: ${item.qty}`
                            )
                            .join("\n\n");

                    return {"success": true, "metadata": {"cartData": cartData}, "message": `Here’s a quick look at what’s in your cart:\n\n${cartItems}\n\n**Subtotal:** €${jsonCartData.subtotalAmount}\n\nLet me know if you'd like to update anything or proceed to checkout 😊`};
                }
                else{
                    console.error("Unsupported cart action:", action);
                    return {"success": false, "message": "I’m having a little trouble right now. Please try again."};
                }

                const response = await fetch(url, {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });
                const jsonRes = await response.json();

                if (action === "add" && jsonRes?.is_add_to_cart === 1){
                    return {"success": true, "metadata": metadata, "message": "🎉 I've added it to your cart. You can keep shopping or head to checkout whenever you're ready."};
                }
                else if (action === "update" && jsonRes?.is_add_to_cart === 1){
                    return {"success": true, "metadata": metadata, "message": "All set! ✅ Your cart has been updated with the new quantity."};
                }
                else if (action === "remove" && jsonRes?.success === true){
                    return {"success": true, "metadata": metadata, "message": "Done! 🗑️ I’ve removed that item from your cart."};
                }

                return {"success": false, "message": "Something didn’t go as expected. Please try again in a moment."};
            }
            catch(error){
                console.error("Cart action error:", error);
                return {"success": false, "message": "I’m having trouble updating your cart right now. Please try again shortly."};
            }
        },
        // Utility to fetch store code from Magento storefront by querying the DOM for the logo link and extracting the store code from its URL. This is necessary for making authenticated API calls to Magento endpoints that require the store code in the URL.
        fetchStoreCode: ()=>{
            const element = document.querySelector(".logo");
            let storeCode = "";
            if (element instanceof HTMLAnchorElement) {
                storeCode = element.href.split("/").filter(Boolean).pop() || "";
            };
            return storeCode;
        },
        // Utility to fetch cart item ID from Magento by reading the cart data from localStorage and finding the item that matches the given product ID. This is used for updating or removing items from the cart by referencing their unique item ID in Magento.
        fetchCartItemId: (productId: number) => {
            const cartData = JSON.parse(localStorage.getItem("mage-cache-storage"))?.cart;
            const item = cartData?.items?.filter((item: any) => item.product_id == productId);
            if (item && item.length > 0) {
                return item[0].item_id;
            }
        },
        // Utility to refresh cart data in the frontend by calling Magento's customer-data API to reload the cart section. This ensures that any changes made to the cart (especially for logged-in users) are reflected in the UI without requiring a full page refresh.
        refreshCart: (sections = ['cart']) => {
            try {
                if (window.require && typeof window.require === 'function') {
                    window.require(['Magento_Customer/js/customer-data'], function (customerData) {
                        customerData.reload(sections, true);
                    });
                }
            }
            catch (error) {
                console.error('Cart refreshing error:', error);
            }
        },
    },

    // woo-commerce adapters
    woocommerce: {
    },
}

export default FEATURES;
