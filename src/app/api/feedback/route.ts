import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json()

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
  }

  const fromLine = name?.trim() ? name.trim() : 'Anonymous'
  const replyTo  = email?.trim() || undefined

  const { error } = await resend.emails.send({
    from:     'Mat Whizzer Feedback <feedback@matwhizzer.com>',
    to:       'info@matwhizzer.com',
    replyTo,
    subject:  `Feedback from ${fromLine}`,
    text: [
      `Name:    ${fromLine}`,
      `Email:   ${replyTo ?? '(not provided)'}`,
      '',
      message.trim(),
    ].join('\n'),
  })

  if (error) {
    console.error('Resend error:', error)
    return NextResponse.json({ error: 'Failed to send. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
