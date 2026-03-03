"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DelightloopTrigger = void 0;
const n8n_workflow_1 = require("n8n-workflow");
/** Recursively strip MongoDB ObjectId _id.buffer noise from objects/arrays */
function cleanPayload(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key === "_id")
            continue; // strip top-level _id
        if (Array.isArray(value)) {
            result[key] = value.map((item) => item && typeof item === "object" && !Array.isArray(item)
                ? cleanPayload(item)
                : item);
        }
        else if (value && typeof value === "object") {
            result[key] = cleanPayload(value);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
// All events the user can subscribe to
const EVENT_OPTIONS = [
    {
        name: "Campaign Created",
        value: "campaign.created",
        description: "Triggered when a new campaign is created",
    },
    {
        name: "Campaign Updated",
        value: "campaign.updated",
        description: "Triggered when campaign details are updated",
    },
    {
        name: "Campaign Status Changed",
        value: "campaign.status_changed",
        description: "Triggered when campaign status changes (draft → live → completed)",
    },
    {
        name: "Campaign Deleted",
        value: "campaign.deleted",
        description: "Triggered when a campaign is deleted",
    },
    {
        name: "Campaign Recipients Added",
        value: "campaign.recipients_added",
        description: "Triggered when recipients are added to a campaign",
    },
    {
        name: "Recipient Created",
        value: "recipient.created",
        description: "Triggered when a recipient is added to a campaign",
    },
    {
        name: "Recipient Status Changed",
        value: "recipient.status_changed",
        description: "Triggered when a recipient status changes",
    },
    {
        name: "Recipient Email Sent",
        value: "recipient.email_sent",
        description: "Triggered when an email is sent to a recipient",
    },
    {
        name: "Recipient Feedback Submitted",
        value: "recipient.feedback_submitted",
        description: "Triggered when a recipient submits gift feedback",
    },
];
// Resolve eventType string (e.g. "campaign.status_changed") → { module, action }
function parseEventType(eventType) {
    const [module, ...rest] = eventType.split(".");
    return { module, action: rest.join("_") };
}
class DelightloopTrigger {
    constructor() {
        this.description = {
            displayName: "Delightloop Trigger",
            name: "delightloopTrigger",
            icon: "file:delightloop.png",
            group: ["trigger"],
            version: 1,
            subtitle: '={{$parameter["events"].join(", ")}}',
            description: "Start a workflow when Delightloop fires a campaign or recipient event",
            defaults: {
                name: "Delightloop Trigger",
            },
            inputs: [],
            outputs: ["main"],
            credentials: [
                {
                    name: "delightloopApi",
                    required: true,
                },
            ],
            webhooks: [
                {
                    name: "default",
                    httpMethod: "POST",
                    responseMode: "onReceived",
                    path: "webhook",
                },
            ],
            properties: [
                {
                    displayName: "Events",
                    name: "events",
                    type: "multiOptions",
                    required: true,
                    default: [],
                    options: EVENT_OPTIONS,
                    description: "Select one or more events to listen for",
                },
                {
                    displayName: "Subscription Name",
                    name: "subscriptionName",
                    type: "string",
                    default: "n8n Delightloop Trigger",
                    description: "A label for this subscription visible in the Delightloop dashboard",
                },
            ],
        };
        // ─── Lifecycle hooks: register / unregister with Delightloop ───────────────
        this.webhookMethods = {
            default: {
                // Check if a subscription for this workflow already exists
                async checkExists() {
                    var _a, _b;
                    const webhookData = this.getWorkflowStaticData("node");
                    const credentials = await this.getCredentials("delightloopApi");
                    const apiKey = credentials.apiKey;
                    const webhookUrl = this.getNodeWebhookUrl("default");
                    // 1. If we have a stored ID, verify it still exists on Delightloop side
                    if (webhookData.subscriptionId) {
                        try {
                            await this.helpers.httpRequest({
                                method: "GET",
                                url: `https://apiv1.delightloop.ai/api/campaigns/webhooks/subscriptions/${webhookData.subscriptionId}`,
                                headers: { "x-api-key": apiKey },
                                json: true,
                            });
                            return true;
                        }
                        catch {
                            // Subscription gone — clear stored ID and fall through to list search
                            delete webhookData.subscriptionId;
                        }
                    }
                    // 2. No stored ID (or it was deleted) — search all subscriptions by URL
                    //    to avoid creating a duplicate
                    try {
                        let page = 1;
                        while (true) {
                            const res = (await this.helpers.httpRequest({
                                method: "GET",
                                url: "https://apiv1.delightloop.ai/api/campaigns/webhooks/subscriptions",
                                headers: { "x-api-key": apiKey },
                                qs: { limit: 100, page },
                                json: true,
                            }));
                            const items = (_a = res.data) !== null && _a !== void 0 ? _a : [];
                            const match = items.find((s) => s.url === webhookUrl);
                            if (match) {
                                // Reuse the existing subscription — store its ID for cleanup later
                                webhookData.subscriptionId = match.subscriptionId;
                                return true;
                            }
                            const totalPages = (_b = res.totalPages) !== null && _b !== void 0 ? _b : 1;
                            if (page >= totalPages || items.length === 0)
                                break;
                            page++;
                        }
                    }
                    catch {
                        // List call failed — let create() handle it
                    }
                    return false;
                },
                // Register a new subscription with Delightloop pointing to our n8n URL
                async create() {
                    const credentials = await this.getCredentials("delightloopApi");
                    const webhookUrl = this.getNodeWebhookUrl("default");
                    const events = this.getNodeParameter("events");
                    const subscriptionName = this.getNodeParameter("subscriptionName");
                    if (!events || events.length === 0) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), "Please select at least one event to listen for.");
                    }
                    const eventPatterns = events.map((e) => parseEventType(e));
                    const body = {
                        name: subscriptionName,
                        url: webhookUrl,
                        eventPatterns,
                    };
                    const response = await this.helpers.httpRequest({
                        method: "POST",
                        url: `https://apiv1.delightloop.ai/api/campaigns/webhooks/subscriptions`,
                        headers: {
                            "x-api-key": credentials.apiKey,
                            "Content-Type": "application/json",
                        },
                        body,
                        json: true,
                    });
                    const res = response;
                    if (!res.subscriptionId) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to create Delightloop webhook subscription: ${JSON.stringify(response)}`);
                    }
                    // Persist subscription ID so we can delete it on deactivate
                    const webhookData = this.getWorkflowStaticData("node");
                    webhookData.subscriptionId = res.subscriptionId;
                    return true;
                },
                // Delete the subscription from Delightloop when workflow is deactivated
                async delete() {
                    const webhookData = this.getWorkflowStaticData("node");
                    if (!webhookData.subscriptionId)
                        return true;
                    try {
                        const credentials = await this.getCredentials("delightloopApi");
                        await this.helpers.httpRequest({
                            method: "DELETE",
                            url: `https://apiv1.delightloop.ai/api/campaigns/webhooks/subscriptions/${webhookData.subscriptionId}`,
                            headers: {
                                "x-api-key": credentials.apiKey,
                            },
                            json: true,
                        });
                    }
                    catch {
                        // Best effort — not a blocking error
                    }
                    delete webhookData.subscriptionId;
                    return true;
                },
            },
        };
    }
    // ─── Receive and forward the webhook payload ────────────────────────────────
    async webhook() {
        const req = this.getRequestObject();
        const body = req.body;
        // Clean MongoDB _id.buffer noise from any nested arrays
        const cleaned = cleanPayload(body);
        return {
            workflowData: [[{ json: cleaned }]],
        };
    }
}
exports.DelightloopTrigger = DelightloopTrigger;
//# sourceMappingURL=DelightloopTrigger.node.js.map