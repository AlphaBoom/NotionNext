// pages/api/auth.js
import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Notion授权返回结果
 */
export interface NotionTokenResponseData {
  access_token: string
  token_type: string
  bot_id: string
  workspace_name: string
  workspace_icon: string
  workspace_id: string
  owner: {
    type: string
    user: {
      object: string
      id: string
      name: string
      avatar_url: string
      type: string
      person: {
        email: string
      }
    }
  }
  duplicated_template_id: string | null
  request_id: string
}

export interface NotionTokenResponse {
  status: number
  statusText: string
  data: NotionTokenResponseData
}

/**
 * Notion授权回调
 * @param req
 * @param res
 * @returns
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const code = Array.isArray(req.query.code)
      ? req.query.code[0]
      : req.query.code

    if (!code) {
      return res.status(400).json({ error: 'Invalid request, code is missing' })
    }

    const params = await fetchToken(code)

    if (params?.status === 200) {
      const redirectQuery = {
        msg: '授权成功'
      }

      // 这里将用户数据写入到Notion数据库
      res.redirect(
        302,
        `/auth/result?${new URLSearchParams(redirectQuery).toString()}`
      )
    } else {
      const redirectQuery = { msg: '授权失败，请重试' }
      res.redirect(
        302,
        `/auth/result?${new URLSearchParams(redirectQuery).toString()}`
      )
    }
  } catch (error) {
    console.error('Notion OAuth callback failed')
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
/**
 * 获取token
 * @param code
 * @returns
 */
const fetchToken = async (code: string): Promise<NotionTokenResponse> => {
  const clientId = process.env.OAUTH_CLIENT_ID
  const clientSecret = process.env.OAUTH_CLIENT_SECRET
  const redirectUri = process.env.OAUTH_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    return {
      status: 503,
      statusText: 'OAuth is not configured',
      data: null as unknown as NotionTokenResponseData
    }
  }
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  try {
    const response = await axios.post<NotionTokenResponseData>(
      'https://api.notion.com/v1/oauth/token',
      {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${encoded}`
        }
      }
    )
    return {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    }
  } catch (error) {
    // Axios errors can include request credentials and token response bodies.
    console.error('Notion OAuth token exchange failed')
    return {
      status: 400,
      statusText: 'failed',
      data: null as unknown as NotionTokenResponseData
    }
  }
}
