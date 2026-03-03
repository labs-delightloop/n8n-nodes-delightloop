# n8n-nodes-delightloop

This package provides [n8n](https://n8n.io) community nodes for [Delightloop](https://delightloop.ai) — a gifting and campaign management platform. It lets you automate contact and campaign workflows directly from n8n.

## Nodes

### Delightloop

Action node with two resources:

**Contact**

| Operation | Description |
|-----------|-------------|
| Create | Create a new contact |
| Bulk Create | Create multiple contacts at once |
| Get | Retrieve a contact by ID |
| Get Many | Retrieve a list of contacts with optional search and pagination |
| Update | Update contact fields |

**Campaign**

| Operation | Description |
|-----------|-------------|
| Get | Retrieve a campaign by ID |
| Get Many | Retrieve a list of campaigns with optional status filter |
| Add Contacts | Add one or more contacts to a live campaign |

### Delightloop Trigger

Webhook trigger node. Starts a workflow when Delightloop fires an event. Supported events:

- `campaign.created` — A new campaign is created
- `campaign.updated` — Campaign details are updated
- `campaign.status_changed` — Campaign status changes (draft → live → completed)
- `campaign.deleted` — A campaign is deleted
- `campaign.recipients_added` — Recipients are added to a campaign
- `recipient.created` — A recipient is added to a campaign
- `recipient.status_changed` — A recipient status changes
- `recipient.email_sent` — An email is sent to a recipient
- `recipient.feedback_submitted` — A recipient submits gift feedback

## Credentials

Only one field is required:

| Field | Description |
|-------|-------------|
| API Key | Your Delightloop API key. Get it from **Settings → API Keys** in the Delightloop dashboard. |

The API key is validated automatically when you save the credential.

## Installation

In your n8n instance go to **Settings → Community Nodes**, click **Install**, and enter:

```
n8n-nodes-delightloop
```

## Example Workflows

### Sync contacts from a CRM to Delightloop
1. Trigger: Schedule or CRM webhook
2. **Delightloop → Contact → Bulk Create** with mapped fields

### React to gift feedback in real time
1. **Delightloop Trigger** → select `recipient.feedback_submitted`
2. Connect to Slack, email, or CRM node to log the feedback

### Add contacts to a campaign when they fill a form
1. Trigger: Typeform / Google Sheets / Webhook
2. **Delightloop → Contact → Create**
3. **Delightloop → Campaign → Add Contacts** using the returned `contactId`

## Resources

- [Delightloop website](https://delightloop.ai)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

MIT
