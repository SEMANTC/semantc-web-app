import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

interface OAuthTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface XeroConnection {
  id: string;
  tenantId: string;
  tenantType: string;
  tenantName: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const { code } = req.query;

  if (!code || typeof code !== "string") {
    res.redirect("/error");
    return;
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post<OAuthTokenResponse>(
      "https://identity.xero.com/connect/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.XERO_REDIRECT_URI!,
        client_id: process.env.XERO_CLIENT_ID!,
        client_secret: process.env.XERO_CLIENT_SECRET!,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const tokenData = tokenResponse.data;

    // Calculate expires_at
    const acquiredTime = Math.floor(Date.now() / 1000); // Current time in seconds
    const expires_at = acquiredTime + tokenData.expires_in;

    // Fetch connected tenants
    const connectionsResponse = await axios.get<XeroConnection[]>(
      "https://api.xero.com/connections",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (connectionsResponse.data.length === 0) {
      throw new Error("No connected tenants found");
    }

    // Use the first connected tenant's ID
    const tenantId = connectionsResponse.data[0].tenantId;

    // Trigger GitHub Actions via repository_dispatch
    const dispatchResponse = await axios.post(
      `https://api.github.com/repos/${process.env.GITHUB_REPO}/dispatches`,
      {
        event_type: "new_tenant",
        client_payload: {
          tenant_id: tenantId,
          tenant_token: {
            access_token: tokenData.access_token,
            expires_in: tokenData.expires_in,
            token_type: tokenData.token_type,
            refresh_token: tokenData.refresh_token,
            id_token: tokenData.id_token,
            scope: tokenData.scope,
            expires_at: expires_at, // Added field
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(dispatchResponse)
    if (dispatchResponse.status === 204) {
      res.redirect("/success");
    } else {
      console.error("GitHub Dispatch Failed:", dispatchResponse.status, dispatchResponse.data);
      res.redirect("/error");
    }
  } catch (error: any) {
    console.error("OAuth Callback Error:", error.response?.data || error.message);
    res.redirect("/error");
  }
}