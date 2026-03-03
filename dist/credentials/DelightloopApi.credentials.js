"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DelightloopApi = void 0;
const BASE_URL = "https://apiv1.delightloop.ai";
class DelightloopApi {
    constructor() {
        this.name = "delightloopApi";
        this.displayName = "Delightloop API";
        this.documentationUrl = "https://delightloop.ai/docs/api";
        this.properties = [
            {
                displayName: "API Key",
                name: "apiKey",
                type: "string",
                typeOptions: { password: true },
                default: "",
                required: true,
                description: "Your Delightloop API key. Get it from Settings → API Keys in the Delightloop dashboard.",
            },
        ];
        this.authenticate = {
            type: "generic",
            properties: {
                headers: {
                    "x-api-key": "={{$credentials.apiKey}}",
                },
            },
        };
        this.test = {
            request: {
                baseURL: BASE_URL,
                url: "/api/users/auth/validate-api-key",
                method: "POST",
                body: {
                    apiKey: "={{$credentials.apiKey}}",
                },
            },
        };
    }
}
exports.DelightloopApi = DelightloopApi;
//# sourceMappingURL=DelightloopApi.credentials.js.map