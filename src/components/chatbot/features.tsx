import axios from "axios";

const BASE_URL = "http://localhost:8000/api";
const N8N_URL = "https://n8n.crossml.in/webhook-test/e5a46886-b8b7-48d1-b097-c39ab1b9d0bf";
const MAGENTO_BASE_URL = "https://edfeb27880.nxcli.net";

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
            const response = await axios.post(`${BASE_URL}/session-metadata/`, { "data": metadata });
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
    handelStreaming: async (response, onChunk)=>{
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) return;

        let partialBuffer = "";
        let accumulatedData: any = {};
        let finalResponse = "";
        let messageStr = "";
        let messageStrEnd = false;
        const sleep = (ms) => new Promise(res => setTimeout(res, ms));

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

        return finalResponse;
    },
    // ** Utility to read cookie value by name **
    getCookie: (name: string) => {
        const value = document.cookie
            .split(";")
            .map(c => c.trim())
            .filter(c => c.startsWith(name + "="))[0] || null;
        if (value) return value?.split("=")[1];
    },

    // Shopify adapters
    shopify: {
        // For Shopify, we can directly use the common sendMessage function since it doesn't require special headers or handling for cart actions in this implementation. However, we keep this structure for consistency and future extensibility.
        sendMessage: async (message: string, session_id: string, onChunk: (chunk: string) => void) =>{
            try{
                if (!message.trim() || !session_id) return null;

                const formData = new FormData();
                formData.append("message", message);
                const cartID = localStorage.getItem("chatbot_cart_id");

                const response = await fetch(N8N_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Session-Id": session_id,
                        "Cart-Id": cartID || "",
                    },
                    body: JSON.stringify({ message }),
                });

                const streamResponse = await FEATURES.handelStreaming(response, onChunk);

                return { success: true };
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
                    console.log("Full stream response:", streamResponse);
                    try{
                        const streamData = JSON.parse(streamResponse);
                        console.log("Full stream data:", streamData);
                        const jsonContent = streamData?.output?.json_content;
                        console.log("Parsed JSON content from stream:", jsonContent);
                        if (jsonContent && jsonContent.cartAction && jsonContent.payload){
                            const cartResult = await FEATURES.magento.handleCartAction(jsonContent.cartAction, jsonContent.payload);
                            console.log("Cart action result:", cartResult);
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

                    return {"success": true, "metadata": cartData, "message": `Here’s a quick look at what’s in your cart:\n\n${cartItems}\n\n**Subtotal:** €${jsonCartData.subtotalAmount}\n\nLet me know if you'd like to update anything or proceed to checkout 😊`};
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
    },

    // woo-commerce adapters
    woocommerce: {
    },
}

export default FEATURES;
