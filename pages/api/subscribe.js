import subscribeToMailchimpApi from '@/lib/plugins/mailchimp'

/**
 * 接受邮件订阅
 * @param {*} req
 * @param {*} res
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'POST') {
    const { email, firstName, lastName, first_name, last_name } = req.body || {}
    if (
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Invalid email address' })
    }
    try {
      const response = await subscribeToMailchimpApi({
        email,
        first_name: first_name ?? firstName,
        last_name: last_name ?? lastName
      })
      if (!response) {
        return res
          .status(503)
          .json({ status: 'error', message: 'Subscription is not configured' })
      }
      if (!response.ok) {
        return res
          .status(response.status === 400 ? 400 : 502)
          .json({ status: 'error', message: 'Subscription failed!' })
      }
      return res
        .status(200)
        .json({ status: 'success', message: 'Subscription successful!' })
    } catch (error) {
      console.error('Subscription request failed')
      return res
        .status(502)
        .json({ status: 'error', message: 'Subscription failed!' })
    }
  } else {
    res.status(405).json({ status: 'error', message: 'Method not allowed' })
  }
}
