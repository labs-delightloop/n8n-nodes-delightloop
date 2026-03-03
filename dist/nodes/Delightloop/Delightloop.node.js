"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Delightloop = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const ContactDescription_1 = require("./descriptions/ContactDescription");
const CampaignDescription_1 = require("./descriptions/CampaignDescription");
// ─── Helpers ────────────────────────────────────────────────────────────────
/** Strip MongoDB ObjectId buffer noise from source arrays */
function cleanSources(obj) {
    if (Array.isArray(obj.sources)) {
        obj.sources = obj.sources.map((s) => {
            const clean = { ...s };
            delete clean._id;
            return clean;
        });
    }
    return obj;
}
/** Return a slim contact object for simplified output */
function simplifyContact(c) {
    return {
        contactId: c.contactId,
        firstName: c.firstName,
        lastName: c.lastName,
        fullName: c.fullName,
        email: c.mailId, // actual email field in Delightloop is mailId
        jobTitle: c.jobTitle,
        companyName: c.companyName,
        linkedinUrl: c.linkedinUrl,
        profileImage: c.profileImage,
        tags: c.tags,
        listIds: c.listIds,
        campaigns: c.campaigns,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    };
}
/** Return a slim campaign object for simplified output */
function simplifyCampaign(c) {
    var _a, _b, _c;
    const data = (_a = c.campaignData) !== null && _a !== void 0 ? _a : {};
    const goal = (_b = data.goal) !== null && _b !== void 0 ? _b : {};
    const motion = (_c = data.motion) !== null && _c !== void 0 ? _c : {};
    return {
        campaignId: c.campaignId,
        name: c.name,
        status: c.status,
        goal: goal.name,
        motion: motion.name,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    };
}
/** Auto-paginate: fetch all pages and return combined items array */
async function fetchAllPages(helpers, url, qs, headers, itemsKey) {
    var _a, _b, _c;
    const all = [];
    let page = 1;
    while (true) {
        const res = (await helpers.httpRequest({
            method: "GET",
            url,
            headers,
            qs: { ...qs, page, limit: 500 },
            json: true,
        }));
        const items = (_a = res[itemsKey]) !== null && _a !== void 0 ? _a : [];
        all.push(...items);
        const total = (_b = res.total) !== null && _b !== void 0 ? _b : 0;
        const totalPages = (_c = res.totalPages) !== null && _c !== void 0 ? _c : 1;
        if (page >= totalPages || items.length === 0 || all.length >= total)
            break;
        page++;
    }
    return all;
}
// ─── Node ───────────────────────────────────────────────────────────────────
class Delightloop {
    constructor() {
        this.description = {
            displayName: "Delightloop",
            name: "delightloop",
            icon: "file:delightloop.png",
            group: ["transform"],
            version: 1,
            subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
            description: "Manage contacts and campaigns in Delightloop",
            defaults: { name: "Delightloop" },
            inputs: ["main"],
            outputs: ["main"],
            credentials: [{ name: "delightloopApi", required: true }],
            properties: [
                {
                    displayName: "Resource",
                    name: "resource",
                    type: "options",
                    noDataExpression: true,
                    options: [
                        { name: "Contact", value: "contact" },
                        { name: "Campaign", value: "campaign" },
                    ],
                    default: "contact",
                },
                ...ContactDescription_1.contactOperations,
                ...ContactDescription_1.contactFields,
                ...CampaignDescription_1.campaignOperations,
                ...CampaignDescription_1.campaignFields,
            ],
        };
    }
    async execute() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const items = this.getInputData();
        const returnData = [];
        const baseUrl = "https://apiv1.delightloop.ai";
        const credentials = await this.getCredentials("delightloopApi");
        const apiKey = credentials.apiKey;
        const resource = this.getNodeParameter("resource", 0);
        const operation = this.getNodeParameter("operation", 0);
        const headers = {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
        };
        for (let i = 0; i < items.length; i++) {
            try {
                let responseData;
                // ═══════════════════════════════════════════════════
                //  CONTACT
                // ═══════════════════════════════════════════════════
                if (resource === "contact") {
                    // ── Create ──
                    if (operation === "create") {
                        const mailId = this.getNodeParameter("mailId", i);
                        const firstName = this.getNodeParameter("firstName", i);
                        const lastName = this.getNodeParameter("lastName", i);
                        const extra = this.getNodeParameter("additionalFields", i);
                        const body = { mailId, firstName, lastName };
                        if (extra.companyName)
                            body.companyName = extra.companyName;
                        if (extra.jobTitle)
                            body.jobTitle = extra.jobTitle;
                        if (extra.phone)
                            body.phoneNumber = extra.phone;
                        if (extra.linkedinUrl)
                            body.linkedinUrl = extra.linkedinUrl;
                        if (extra.tags) {
                            try {
                                body.tags =
                                    typeof extra.tags === "string"
                                        ? JSON.parse(extra.tags)
                                        : extra.tags;
                            }
                            catch {
                                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Tags must be a valid JSON array, e.g. [{"name":"vip","color":"#FF5733"}]', { itemIndex: i });
                            }
                        }
                        responseData = await this.helpers.httpRequest({
                            method: "POST",
                            url: `${baseUrl}/api/campaigns/contacts`,
                            headers,
                            body,
                            json: true,
                        });
                    }
                    // ── Bulk Create ──
                    else if (operation === "bulkCreate") {
                        const raw = this.getNodeParameter("contactsJson", i);
                        let contacts;
                        try {
                            contacts = typeof raw === "string" ? JSON.parse(raw) : raw;
                        }
                        catch {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), "Contacts JSON is not valid JSON", { itemIndex: i });
                        }
                        if (!Array.isArray(contacts)) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), "Contacts JSON must be an array", { itemIndex: i });
                        }
                        // Ensure each contact uses mailId not email
                        const normalised = contacts.map((c) => {
                            const contact = { ...c };
                            if (contact.email && !contact.mailId) {
                                contact.mailId = contact.email;
                                delete contact.email;
                            }
                            return contact;
                        });
                        // Response: { successfulContacts, failedContacts, totalContacts, createdContactIds, errors }
                        responseData = await this.helpers.httpRequest({
                            method: "POST",
                            url: `${baseUrl}/api/campaigns/contacts/bulk`,
                            headers,
                            body: { contacts: normalised },
                            json: true,
                        });
                    }
                    // ── Get ──
                    else if (operation === "get") {
                        const contactId = this.getNodeParameter("contactId", i);
                        const raw = (await this.helpers.httpRequest({
                            method: "GET",
                            url: `${baseUrl}/api/campaigns/contacts/${contactId}`,
                            headers,
                            json: true,
                        }));
                        responseData = cleanSources(raw);
                    }
                    // ── Get All ──
                    else if (operation === "getAll") {
                        const returnAll = this.getNodeParameter("returnAll", i);
                        const limit = returnAll
                            ? 500
                            : this.getNodeParameter("limit", i);
                        const filters = this.getNodeParameter("filters", i);
                        const options = this.getNodeParameter("options", i);
                        const simplify = options.simplify;
                        const includePagination = options.includePagination;
                        const qs = { limit, page: 1 };
                        if (filters.search)
                            qs.search = filters.search;
                        let contacts;
                        let paginationMeta = {};
                        if (returnAll) {
                            contacts = await fetchAllPages(this.helpers, `${baseUrl}/api/campaigns/contacts`, qs, headers, "items");
                        }
                        else {
                            const res = (await this.helpers.httpRequest({
                                method: "GET",
                                url: `${baseUrl}/api/campaigns/contacts`,
                                headers,
                                qs,
                                json: true,
                            }));
                            contacts = (_a = res.items) !== null && _a !== void 0 ? _a : [];
                            paginationMeta = {
                                total: (_b = res.total) !== null && _b !== void 0 ? _b : contacts.length,
                                page: (_c = res.page) !== null && _c !== void 0 ? _c : 1,
                                limit: (_d = res.limit) !== null && _d !== void 0 ? _d : contacts.length,
                                totalPages: (_e = res.totalPages) !== null && _e !== void 0 ? _e : 1,
                            };
                        }
                        const processed = contacts
                            .map(cleanSources)
                            .map((c) => (simplify ? simplifyContact(c) : c));
                        const outputItems = processed.map((c) => ({
                            json: includePagination
                                ? { ...c, _pagination: paginationMeta }
                                : c,
                        }));
                        returnData.push(...outputItems);
                        continue;
                    }
                    // ── Update ──
                    else if (operation === "update") {
                        const contactId = this.getNodeParameter("contactId", i);
                        const updateFields = this.getNodeParameter("updateFields", i);
                        const body = {};
                        for (const [key, val] of Object.entries(updateFields)) {
                            if (val !== "" && val !== undefined && val !== null)
                                body[key] = val;
                        }
                        if (Object.keys(body).length === 0) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), "Please add at least one field to update", { itemIndex: i });
                        }
                        responseData = await this.helpers.httpRequest({
                            method: "PUT",
                            url: `${baseUrl}/api/campaigns/contacts/${contactId}`,
                            headers,
                            body,
                            json: true,
                        });
                    }
                }
                // ═══════════════════════════════════════════════════
                //  CAMPAIGN
                // ═══════════════════════════════════════════════════
                else if (resource === "campaign") {
                    // ── Get ──
                    if (operation === "get") {
                        const campaignId = this.getNodeParameter("campaignId", i);
                        responseData = await this.helpers.httpRequest({
                            method: "GET",
                            url: `${baseUrl}/api/campaigns/campaigns/${campaignId}`,
                            headers,
                            json: true,
                        });
                    }
                    // ── Get All ──
                    else if (operation === "getAll") {
                        const returnAll = this.getNodeParameter("returnAll", i);
                        const limit = returnAll
                            ? 500
                            : this.getNodeParameter("limit", i);
                        const filters = this.getNodeParameter("filters", i);
                        const options = this.getNodeParameter("options", i);
                        const simplify = options.simplify;
                        const includePagination = options.includePagination;
                        const qs = { limit, page: 1 };
                        if (filters.status)
                            qs.status = filters.status;
                        if (filters.search)
                            qs.search = filters.search;
                        let campaigns;
                        let paginationMeta = {};
                        if (returnAll) {
                            campaigns = await fetchAllPages(this.helpers, `${baseUrl}/api/campaigns/campaigns`, qs, headers, "campaigns");
                        }
                        else {
                            const res = (await this.helpers.httpRequest({
                                method: "GET",
                                url: `${baseUrl}/api/campaigns/campaigns`,
                                headers,
                                qs,
                                json: true,
                            }));
                            campaigns = (_f = res.campaigns) !== null && _f !== void 0 ? _f : [];
                            paginationMeta = {
                                total: (_g = res.total) !== null && _g !== void 0 ? _g : campaigns.length,
                                page: (_h = res.page) !== null && _h !== void 0 ? _h : 1,
                                limit: (_j = res.limit) !== null && _j !== void 0 ? _j : campaigns.length,
                                totalPages: (_k = res.totalPages) !== null && _k !== void 0 ? _k : 1,
                            };
                        }
                        const processed = campaigns.map((c) => simplify ? simplifyCampaign(c) : c);
                        const outputItems = processed.map((c) => ({
                            json: includePagination
                                ? { ...c, _pagination: paginationMeta }
                                : c,
                        }));
                        returnData.push(...outputItems);
                        continue;
                    }
                    // ── Add Contacts ──
                    else if (operation === "addContacts") {
                        const campaignId = this.getNodeParameter("campaignId", i);
                        const contactIdsRaw = this.getNodeParameter("contactIds", i);
                        const contactIds = contactIdsRaw
                            .split(",")
                            .map((id) => id.trim())
                            .filter(Boolean);
                        if (contactIds.length === 0) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), "Please provide at least one contact ID", { itemIndex: i });
                        }
                        responseData = await this.helpers.httpRequest({
                            method: "POST",
                            url: `${baseUrl}/api/campaigns/campaigns/${campaignId}/add-contacts`,
                            headers,
                            body: { contactIds },
                            json: true,
                        });
                    }
                }
                // ── Normalise output ──
                const outputItems = Array.isArray(responseData)
                    ? responseData.map((item) => ({ json: item }))
                    : [{ json: responseData }];
                returnData.push(...outputItems);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: (_l = error.message) !== null && _l !== void 0 ? _l : String(error) },
                        pairedItem: i,
                    });
                    continue;
                }
                if (error instanceof n8n_workflow_1.NodeOperationError)
                    throw error;
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), (_m = error.message) !== null && _m !== void 0 ? _m : String(error), { itemIndex: i });
            }
        }
        return [returnData];
    }
}
exports.Delightloop = Delightloop;
//# sourceMappingURL=Delightloop.node.js.map