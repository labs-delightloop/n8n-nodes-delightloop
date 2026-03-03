import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

const BASE_URL = "https://apiv1.delightloop.ai";

export class DelightloopApi implements ICredentialType {
  name = "delightloopApi";
  displayName = "Delightloop API";
  documentationUrl = "https://delightloop.ai/docs/api";

  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
      description:
        "Your Delightloop API key. Get it from Settings → API Keys in the Delightloop dashboard.",
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      headers: {
        "x-api-key": "={{$credentials.apiKey}}",
      },
    },
  };

  test: ICredentialTestRequest = {
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
