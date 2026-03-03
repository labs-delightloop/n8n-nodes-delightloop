import { INodeProperties } from "n8n-workflow";

export const campaignOperations: INodeProperties[] = [
  {
    displayName: "Operation",
    name: "operation",
    type: "options",
    noDataExpression: true,
    displayOptions: { show: { resource: ["campaign"] } },
    options: [
      {
        name: "Add Contacts",
        value: "addContacts",
        description: "Add one or more contacts to a live campaign",
        action: "Add contacts to a campaign",
      },
      {
        name: "Get",
        value: "get",
        description: "Retrieve a campaign",
        action: "Get a campaign",
      },
      {
        name: "Get Many",
        value: "getAll",
        description: "Retrieve a list of campaigns",
        action: "Get many campaigns",
      },
    ],
    default: "getAll",
  },
];

export const campaignFields: INodeProperties[] = [
  // ─────────────────────────── GET / ADD CONTACTS ───────────────────────────
  {
    displayName: "Campaign ID",
    name: "campaignId",
    type: "string",
    required: true,
    default: "",
    placeholder: "e.g. camp-xxxxxxxx",
    displayOptions: {
      show: { resource: ["campaign"], operation: ["get", "addContacts"] },
    },
    description: "The ID of the campaign",
  },

  // ─────────────────────────── GET MANY ───────────────────────────
  {
    displayName: "Return All",
    name: "returnAll",
    type: "boolean",
    default: false,
    displayOptions: {
      show: { resource: ["campaign"], operation: ["getAll"] },
    },
    description: "Whether to return all results or only up to a given limit",
  },
  {
    displayName: "Limit",
    name: "limit",
    type: "number",
    default: 50,
    typeOptions: { minValue: 1, maxValue: 500 },
    displayOptions: {
      show: {
        resource: ["campaign"],
        operation: ["getAll"],
        returnAll: [false],
      },
    },
    description: "Max number of results to return",
  },
  {
    displayName: "Filters",
    name: "filters",
    type: "collection",
    placeholder: "Add Filter",
    default: {},
    displayOptions: {
      show: { resource: ["campaign"], operation: ["getAll"] },
    },
    options: [
      {
        displayName: "Search",
        name: "search",
        type: "string",
        default: "",
        placeholder: "e.g. Q1 Campaign",
        description: "Search campaigns by name",
      },
      {
        displayName: "Status",
        name: "status",
        type: "options",
        default: "",
        options: [
          { name: "All", value: "" },
          { name: "Completed", value: "completed" },
          { name: "Draft", value: "draft" },
          { name: "Live", value: "live" },
          { name: "Paused", value: "paused" },
          { name: "Preparing", value: "preparing" },
        ],
        description: "Filter campaigns by status",
      },
    ],
  },
  {
    displayName: "Options",
    name: "options",
    type: "collection",
    placeholder: "Add Option",
    default: {},
    displayOptions: {
      show: { resource: ["campaign"], operation: ["getAll"] },
    },
    options: [
      {
        displayName: "Include Pagination Info",
        name: "includePagination",
        type: "boolean",
        default: false,
        description:
          "Whether to add pagination metadata (total, page, totalPages) to each output item",
      },
      {
        displayName: "Simplify",
        name: "simplify",
        type: "boolean",
        default: false,
        description:
          "Whether to return a simplified version of the response instead of the raw data",
      },
    ],
  },

  // ─────────────────────────── ADD CONTACTS ───────────────────────────
  {
    displayName: "Contact IDs",
    name: "contactIds",
    type: "string",
    required: true,
    default: "",
    placeholder: "e.g. contact_abc,contact_xyz",
    displayOptions: {
      show: { resource: ["campaign"], operation: ["addContacts"] },
    },
    description:
      "Comma-separated list of contact IDs to add to the campaign",
  },
];
