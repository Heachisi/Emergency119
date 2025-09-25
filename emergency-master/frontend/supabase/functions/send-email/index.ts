import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, code } = await req.json()
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY가 설정되지 않았습니다')
    }

    // Resend API를 통해 실제 이메일 발송
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: [email],
        subject: '[Emergency119] 이메일 인증번호',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #FF6B35;">Emergency 119</h1>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
              <h2 style="color: #333; margin-bottom: 20px;">이메일 인증번호</h2>
              <div style="font-size: 32px; font-weight: bold; color: #FF6B35; background: white; padding: 15px; border-radius: 8px; letter-spacing: 5px; margin: 20px 0;">
                ${code}
              </div>
              <p style="color: #666; margin-top: 20px;">
                이 인증번호는 <strong>3분</strong> 후에 만료됩니다.
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                본인이 요청하지 않았다면 이 이메일을 무시해주세요.
              </p>
            </div>
          </div>
        `,
      }),
    })

    const data = await res.json()
    
    if (!res.ok) {
      throw new Error(`이메일 발송 실패: ${data.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '인증번호가 발송되었습니다. 이메일을 확인해주세요.' 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('이메일 발송 오류:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `이메일 발송 중 오류가 발생했습니다: ${error.message}` 
      }), 
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})