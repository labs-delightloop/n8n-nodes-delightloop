"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactFields = exports.contactOperations = void 0;
exports.contactOperations = [
    {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["contact"] } },
        options: [
            {
                name: "Create",
                value: "create",
                description: "Create a new contact",
                action: "Create a contact",
            },
            {
                name: "Bulk Create",
                value: "bulkCreate",
                description: "Create multiple contacts at once",
                action: "Bulk create contacts",
            },
            {
                name: "Get",
                value: "get",
                description: "Retrieve a contact",
                action: "Get a contact",
            },
            {
                name: "Get Many",
                value: "getAll",
                description: "Retrieve a list of contacts",
                action: "Get many contacts",
            },
            {
                name: "Update",
                value: "update",
                description: "Update a contact",
                action: "Update a contact",
            },
        ],
        default: "create",
    },
];
exports.contactFields = [
    // ─────────────────────────── CREATE ───────────────────────────
    {
        displayName: "Email",
        name: "mailId",
        type: "string",
        placeholder: "e.g. nathan@example.com",
        default: "",
        required: true,
        displayOptions: { show: { resource: ["contact"], operation: ["create"] } },
        description: "Primary email address of the contact",
    },
    {
        displayName: "First Name",
        name: "firstName",
        type: "string",
        placeholder: "e.g. Nathan",
        default: "",
        displayOptions: { show: { resource: ["contact"], operation: ["create"] } },
    },
    {
        displayName: "Last Name",
        name: "lastName",
        type: "string",
        placeholder: "e.g. Smith",
        default: "",
        displayOptions: { show: { resource: ["contact"], operation: ["create"] } },
    },
    {
        displayName: "Additional Fields",
        name: "additionalFields",
        type: "collection",
        placeholder: "Add Field",
        default: {},
        displayOptions: { show: { resource: ["contact"], operation: ["create"] } },
        options: [
            {
                displayName: "Company",
                name: "companyName",
                type: "string",
                default: "",
                placeholder: "e.g. Acme Corp",
            },
            {
                displayName: "Job Title",
                name: "jobTitle",
                type: "string",
                default: "",
                placeholder: "e.g. Software Engineer",
            },
            {
                displayName: "LinkedIn URL",
                name: "linkedinUrl",
                type: "string",
                default: "",
                placeholder: "e.g. https://linkedin.com/in/nathansmith",
            },
            {
                displayName: "Phone",
                name: "phone",
                type: "string",
                default: "",
                placeholder: "e.g. +1 555 000 0000",
            },
            {
                displayName: "Tags",
                name: "tags",
                type: "json",
                default: '[{"name":"vip","color":"#FF5733"}]',
                description: 'Array of tag objects with <code>name</code> (required) and optional <code>color</code> (hex). Example: <code>[{"name":"vip","color":"#FF5733"}]</code>',
            },
        ],
    },
    // ─────────────────────────── BULK CREATE ───────────────────────────
    {
        displayName: "Contacts",
        name: "contactsJson",
        type: "json",
        required: true,
        default: `[\n  { "email": "john@example.com", "firstName": "John", "lastName": "Doe", "companyName": "Acme" }\n]`,
        displayOptions: {
            show: { resource: ["contact"], operation: ["bulkCreate"] },
        },
        description: "Array of contact objects. Each must have at least an <code>email</code>. Optional fields: firstName, lastName, companyName, jobTitle, phone, linkedinUrl.",
    },
    // ─────────────────────────── GET ───────────────────────────
    {
        displayName: "Contact ID",
        name: "contactId",
        type: "string",
        required: true,
        default: "",
        placeholder: "e.g. contact_xxxxxxxx",
        displayOptions: {
            show: { resource: ["contact"], operation: ["get", "update"] },
        },
        description: "The ID of the contact",
    },
    // ─────────────────────────── GET MANY ───────────────────────────
    {
        displayName: "Return All",
        name: "returnAll",
        type: "boolean",
        default: false,
        displayOptions: { show: { resource: ["contact"], operation: ["getAll"] } },
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
                resource: ["contact"],
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
        displayOptions: { show: { resource: ["contact"], operation: ["getAll"] } },
        options: [
            {
                displayName: "Search",
                name: "search",
                type: "string",
                default: "",
                placeholder: "e.g. John",
                description: "Search by name, email, company, or job title",
            },
        ],
    },
    {
        displayName: "Options",
        name: "options",
        type: "collection",
        placeholder: "Add Option",
        default: {},
        displayOptions: { show: { resource: ["contact"], operation: ["getAll"] } },
        options: [
            {
                displayName: "Include Pagination Info",
                name: "includePagination",
                type: "boolean",
                default: false,
                description: "Whether to add pagination metadata (total, page, totalPages) to each output item",
            },
            {
                displayName: "Simplify",
                name: "simplify",
                type: "boolean",
                default: false,
                description: "Whether to return a simplified version of the response instead of the raw data",
            },
        ],
    },
    // ─────────────────────────── UPDATE ───────────────────────────
    {
        displayName: "Update Fields",
        name: "updateFields",
        type: "collection",
        placeholder: "Add Field",
        default: {},
        displayOptions: { show: { resource: ["contact"], operation: ["update"] } },
        options: [
            {
                displayName: "Company",
                name: "companyName",
                type: "string",
                default: "",
                placeholder: "e.g. Acme Corp",
            },
            {
                displayName: "Email",
                name: "mailId",
                type: "string",
                default: "",
                placeholder: "e.g. nathan@example.com",
            },
            {
                displayName: "First Name",
                name: "firstName",
                type: "string",
                default: "",
                placeholder: "e.g. Nathan",
            },
            {
                displayName: "Job Title",
                name: "jobTitle",
                type: "string",
                default: "",
                placeholder: "e.g. Software Engineer",
            },
            {
                displayName: "Last Name",
                name: "lastName",
                type: "string",
                default: "",
                placeholder: "e.g. Smith",
            },
            {
                displayName: "LinkedIn URL",
                name: "linkedinUrl",
                type: "string",
                default: "",
                placeholder: "e.g. https://linkedin.com/in/nathansmith",
            },
            {
                displayName: "Phone",
                name: "phoneNumber",
                type: "string",
                default: "",
                placeholder: "e.g. +1 555 000 0000",
            },
        ],
    },
];
//# sourceMappingURL=ContactDescription.js.map