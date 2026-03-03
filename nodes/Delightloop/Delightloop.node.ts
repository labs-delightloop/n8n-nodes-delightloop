import {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from "n8n-workflow";

import {
  contactFields,
  contactOperations,
} from "./descriptions/ContactDescription";
import {
  campaignFields,
  campaignOperations,
} from "./descriptions/CampaignDescription";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Strip MongoDB ObjectId buffer noise from source arrays */
function cleanSources(obj: IDataObject): IDataObject {
  if (Array.isArray(obj.sources)) {
    obj.sources = (obj.sources as IDataObject[]).map((s) => {
      const clean = { ...s };
      delete clean._id;
      return clean;
    });
  }
  return obj;
}

/** Return a slim contact object for simplified output */
function simplifyContact(c: IDataObject): IDataObject {
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
function simplifyCampaign(c: IDataObject): IDataObject {
  const data = (c.campaignData as IDataObject) ?? {};
  const goal = (data.goal as IDataObject) ?? {};
  const motion = (data.motion as IDataObject) ?? {};
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
async function fetchAllPages(
  helpers: IExecuteFunctions["helpers"],
  url: string,
  qs: IDataObject,
  headers: Record<string, string>,
  itemsKey: string,
): Promise<IDataObject[]> {
  const all: IDataObject[] = [];
  let page = 1;

  while (true) {
    const res = (await helpers.httpRequest({
      method: "GET",
      url,
      headers,
      qs: { ...qs, page, limit: 500 },
      json: true,
    })) as IDataObject;

    const items = (res[itemsKey] as IDataObject[]) ?? [];
    all.push(...items);

    const total = (res.total as number) ?? 0;
    const totalPages = (res.totalPages as number) ?? 1;

    if (page >= totalPages || items.length === 0 || all.length >= total) break;
    page++;
  }

  return all;
}

// ─── Node ───────────────────────────────────────────────────────────────────

export class Delightloop implements INodeType {
  description: INodeTypeDescription = {
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
      ...contactOperations,
      ...contactFields,
      ...campaignOperations,
      ...campaignFields,
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const baseUrl = "https://apiv1.delightloop.ai";
    const credentials = await this.getCredentials("delightloopApi");
    const apiKey = credentials.apiKey as string;

    const resource = this.getNodeParameter("resource", 0) as string;
    const operation = this.getNodeParameter("operation", 0) as string;

    const headers = {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    };

    for (let i = 0; i < items.length; i++) {
      try {
        let responseData: unknown;

        // ═══════════════════════════════════════════════════
        //  CONTACT
        // ═══════════════════════════════════════════════════
        if (resource === "contact") {
          // ── Create ──
          if (operation === "create") {
            const mailId = this.getNodeParameter("mailId", i) as string;
            const firstName = this.getNodeParameter("firstName", i) as string;
            const lastName = this.getNodeParameter("lastName", i) as string;
            const extra = this.getNodeParameter(
              "additionalFields",
              i,
            ) as IDataObject;

            const body: IDataObject = { mailId, firstName, lastName };
            if (extra.companyName) body.companyName = extra.companyName;
            if (extra.jobTitle) body.jobTitle = extra.jobTitle;
            if (extra.phone) body.phoneNumber = extra.phone;
            if (extra.linkedinUrl) body.linkedinUrl = extra.linkedinUrl;
            if (extra.tags) {
              try {
                body.tags =
                  typeof extra.tags === "string"
                    ? JSON.parse(extra.tags as string)
                    : extra.tags;
              } catch {
                throw new NodeOperationError(
                  this.getNode(),
                  'Tags must be a valid JSON array, e.g. [{"name":"vip","color":"#FF5733"}]',
                  { itemIndex: i },
                );
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
            const raw = this.getNodeParameter("contactsJson", i) as string;
            let contacts: IDataObject[];
            try {
              contacts = typeof raw === "string" ? JSON.parse(raw) : raw;
            } catch {
              throw new NodeOperationError(
                this.getNode(),
                "Contacts JSON is not valid JSON",
                { itemIndex: i },
              );
            }
            if (!Array.isArray(contacts)) {
              throw new NodeOperationError(
                this.getNode(),
                "Contacts JSON must be an array",
                { itemIndex: i },
              );
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
            const contactId = this.getNodeParameter("contactId", i) as string;
            const raw = (await this.helpers.httpRequest({
              method: "GET",
              url: `${baseUrl}/api/campaigns/contacts/${contactId}`,
              headers,
              json: true,
            })) as IDataObject;
            responseData = cleanSources(raw);
          }

          // ── Get All ──
          else if (operation === "getAll") {
            const returnAll = this.getNodeParameter("returnAll", i) as boolean;
            const limit = returnAll
              ? 500
              : (this.getNodeParameter("limit", i) as number);
            const filters = this.getNodeParameter("filters", i) as IDataObject;
            const options = this.getNodeParameter("options", i) as IDataObject;
            const simplify = options.simplify as boolean;
            const includePagination = options.includePagination as boolean;

            const qs: IDataObject = { limit, page: 1 };
            if (filters.search) qs.search = filters.search as string;

            let contacts: IDataObject[];
            let paginationMeta: IDataObject = {};

            if (returnAll) {
              contacts = await fetchAllPages(
                this.helpers,
                `${baseUrl}/api/campaigns/contacts`,
                qs,
                headers,
                "items",
              );
            } else {
              const res = (await this.helpers.httpRequest({
                method: "GET",
                url: `${baseUrl}/api/campaigns/contacts`,
                headers,
                qs,
                json: true,
              })) as IDataObject;

              contacts = (res.items as IDataObject[]) ?? [];
              paginationMeta = {
                total: res.total ?? contacts.length,
                page: res.page ?? 1,
                limit: res.limit ?? contacts.length,
                totalPages: res.totalPages ?? 1,
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
            const contactId = this.getNodeParameter("contactId", i) as string;
            const updateFields = this.getNodeParameter(
              "updateFields",
              i,
            ) as IDataObject;

            const body: IDataObject = {};
            for (const [key, val] of Object.entries(updateFields)) {
              if (val !== "" && val !== undefined && val !== null)
                body[key] = val as string;
            }

            if (Object.keys(body).length === 0) {
              throw new NodeOperationError(
                this.getNode(),
                "Please add at least one field to update",
                { itemIndex: i },
              );
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
            const campaignId = this.getNodeParameter("campaignId", i) as string;
            responseData = await this.helpers.httpRequest({
              method: "GET",
              url: `${baseUrl}/api/campaigns/campaigns/${campaignId}`,
              headers,
              json: true,
            });
          }

          // ── Get All ──
          else if (operation === "getAll") {
            const returnAll = this.getNodeParameter("returnAll", i) as boolean;
            const limit = returnAll
              ? 500
              : (this.getNodeParameter("limit", i) as number);
            const filters = this.getNodeParameter("filters", i) as IDataObject;
            const options = this.getNodeParameter("options", i) as IDataObject;
            const simplify = options.simplify as boolean;
            const includePagination = options.includePagination as boolean;

            const qs: IDataObject = { limit, page: 1 };
            if (filters.status) qs.status = filters.status as string;
            if (filters.search) qs.search = filters.search as string;

            let campaigns: IDataObject[];
            let paginationMeta: IDataObject = {};

            if (returnAll) {
              campaigns = await fetchAllPages(
                this.helpers,
                `${baseUrl}/api/campaigns/campaigns`,
                qs,
                headers,
                "campaigns",
              );
            } else {
              const res = (await this.helpers.httpRequest({
                method: "GET",
                url: `${baseUrl}/api/campaigns/campaigns`,
                headers,
                qs,
                json: true,
              })) as IDataObject;

              campaigns = (res.campaigns as IDataObject[]) ?? [];
              paginationMeta = {
                total: res.total ?? campaigns.length,
                page: res.page ?? 1,
                limit: res.limit ?? campaigns.length,
                totalPages: res.totalPages ?? 1,
              };
            }

            const processed = campaigns.map((c) =>
              simplify ? simplifyCampaign(c) : c,
            );

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
            const campaignId = this.getNodeParameter("campaignId", i) as string;
            const contactIdsRaw = this.getNodeParameter(
              "contactIds",
              i,
            ) as string;

            const contactIds = contactIdsRaw
              .split(",")
              .map((id) => id.trim())
              .filter(Boolean);

            if (contactIds.length === 0) {
              throw new NodeOperationError(
                this.getNode(),
                "Please provide at least one contact ID",
                { itemIndex: i },
              );
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
        const outputItems: INodeExecutionData[] = Array.isArray(responseData)
          ? (responseData as IDataObject[]).map((item) => ({ json: item }))
          : [{ json: responseData as IDataObject }];

        returnData.push(...outputItems);
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message ?? String(error) },
            pairedItem: i,
          });
          continue;
        }
        if (error instanceof NodeOperationError) throw error;
        throw new NodeOperationError(
          this.getNode(),
          (error as Error).message ?? String(error),
          { itemIndex: i },
        );
      }
    }

    return [returnData];
  }
}
