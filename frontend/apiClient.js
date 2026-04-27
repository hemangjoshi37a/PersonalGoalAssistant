/**
 * apiClient.js
 * Centralized API wrapper to handle timeouts, JSON parsing, and standard error handling.
 */

class ApiClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.defaultTimeout = 30000; // 30 seconds default for AI tasks
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), options.timeout || this.defaultTimeout);

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            },
            signal: controller.signal
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            clearTimeout(id);

            const contentType = response.headers.get('content-type');
            let data = null;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                const errorMessage = data && data.error ? data.error : `HTTP Error: ${response.status}`;
                throw new Error(errorMessage);
            }

            return data;
        } catch (error) {
            clearTimeout(id);
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. The server is taking too long to respond.');
            }
            throw error;
        }
    }

    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    post(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'POST', body });
    }

    put(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PUT', body });
    }

    patch(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PATCH', body });
    }

    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    /**
     * Connects to a Server-Sent Events endpoint and streams the response.
     * @param {string} endpoint 
     * @param {object} body 
     * @param {function} onChunk 
     */
    async stream(endpoint, body, onChunk) {
        const url = `${this.baseURL}${endpoint}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || `HTTP Error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (let line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') {
                            return;
                        }
                        try {
                            const parsed = JSON.parse(dataStr);
                            onChunk(parsed);
                        } catch (e) {
                            // If it's not JSON, just pass the string
                            onChunk({ text: dataStr });
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Stream failed:", error);
            throw error;
        }
    }
}

// Export for module systems, or attach to window for standard scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
} else {
    window.ApiClient = ApiClient;
}
