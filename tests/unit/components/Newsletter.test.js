import React from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import Newsletter from '@/themes/landing/components/Newsletter'
import Footer from '@/themes/landing/components/Footer'
import MailChimpForm from '@/themes/fukasawa/components/MailChimpForm'

jest.mock('@/blog.config', () => ({}))
jest.mock('@/lib/config', () => ({ siteConfig: () => 'true' }))
jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: { MAILCHIMP: { EMAIL: 'Email', SUBSCRIBE: 'Subscribe', MSG: '' } }
  })
}))
jest.mock(
  '@/components/SmartLink',
  () =>
    function MockSmartLink({ children, ...props }) {
      return <a {...props}>{children}</a>
    }
)
jest.mock('@/themes/landing/components/Logo', () => () => null)

test.each([
  ['Landing newsletter', Newsletter, 400],
  ['Landing footer', Footer, 502],
  ['Fukasawa form', MailChimpForm, 503]
])(
  '%s shows failure and allows a successful retry',
  async (_name, Form, status) => {
    // A second newsletter on the page must not supply this form's email.
    const otherEmail = document.createElement('input')
    otherEmail.id = 'newsletter'
    otherEmail.value = 'other@example.com'
    document.body.appendChild(otherEmail)

    let finishRequest
    fetch.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finishRequest = resolve
        })
    )
    const { container } = render(<Form />)
    const input = within(container).getByRole('textbox')
    const button = within(container).getByRole('button', { name: 'Subscribe' })
    fireEvent.change(input, { target: { value: 'reader@example.com' } })
    fireEvent.submit(input.closest('form'))

    expect(button).toBeDisabled()
    expect(JSON.parse(fetch.mock.calls[0][1].body).email).toBe(
      'reader@example.com'
    )
    await act(async () => {
      finishRequest({
        ok: false,
        status,
        json: () =>
          Promise.resolve({ status: 'error', message: 'Subscription failed!' })
      })
      await Promise.resolve()
    })
    expect(screen.getByRole('alert')).toBeVisible()
    expect(input).toBeEnabled()
    expect(button).toBeEnabled()
    expect(
      screen.queryByText(/Thanks for subscribing|感谢您的订阅/)
    ).not.toBeInTheDocument()

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'success' })
    })
    fireEvent.submit(input.closest('form'))
    expect(
      await screen.findByText(/Thanks for subscribing|感谢您的订阅/)
    ).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(button).toBeDisabled()
    expect(fetch).toHaveBeenCalledTimes(2)
  }
)
