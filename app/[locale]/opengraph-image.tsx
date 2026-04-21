import { ImageResponse } from 'next/og'
import en from '@/messages/en.json'
import zh from '@/messages/zh.json'
import ua from '@/messages/ua.json'

export const runtime = 'edge'
export const alt = 'WAY TO FUTURE UA'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const allMessages: Record<string, typeof en> = { en, zh, ua }

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const bgUrl = new URL('/og-bg.jpg', process.env.NEXT_PUBLIC_APP_URL || 'https://waytofutureua.org.ua')
  const bgData = await fetch(bgUrl).then(res => res.arrayBuffer())
  const bgBase64 = `data:image/jpeg;base64,${Buffer.from(bgData).toString('base64')}`

  const msgs = allMessages[locale] || allMessages.en
  const t = {
    badge: msgs.metadata.ogBadge.toUpperCase(),
    tagline: msgs.metadata.ogTagline,
    donate: msgs.navigation.donate.toUpperCase(),
    track: msgs.navigation.trackDonation.toUpperCase(),
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Background photo — fetched at runtime, not bundled */}
        <img
          src={bgBase64}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Dark overlay for text readability */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(110deg, rgba(2,38,62,0.92) 0%, rgba(2,38,62,0.88) 45%, rgba(7,108,179,0.6) 75%, rgba(7,108,179,0.35) 100%)',
            display: 'flex',
          }}
        />

        {/* Ukraine flag accent — top stripe */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            display: 'flex',
          }}
        >
          <div style={{ flex: 1, background: '#005BBB', display: 'flex' }} />
          <div style={{ flex: 1, background: '#FFD500', display: 'flex' }} />
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '70px 80px',
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '28px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 20px',
                background: 'rgba(245,184,0,0.15)',
                border: '1.5px solid rgba(245,184,0,0.5)',
                borderRadius: '50px',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#F5B800',
                  marginRight: '10px',
                  display: 'flex',
                }}
              />
              <div
                style={{
                  fontSize: '15px',
                  color: '#F5B800',
                  fontWeight: 700,
                  letterSpacing: '2.5px',
                  display: 'flex',
                }}
              >
                {t.badge}
              </div>
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                fontSize: '68px',
                fontWeight: 900,
                color: 'white',
                letterSpacing: '-1px',
                lineHeight: 1.05,
                display: 'flex',
              }}
            >
              WAY TO
            </div>
            <div
              style={{
                fontSize: '68px',
                fontWeight: 900,
                color: 'white',
                letterSpacing: '-1px',
                lineHeight: 1.05,
                display: 'flex',
              }}
            >
              FUTURE UA
            </div>
          </div>

          {/* Accent line */}
          <div
            style={{
              width: '80px',
              height: '4px',
              background: 'linear-gradient(90deg, #F5B800, #FFD500)',
              borderRadius: '2px',
              marginBottom: '24px',
              display: 'flex',
            }}
          />

          {/* Tagline */}
          <div
            style={{
              fontSize: '22px',
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.5,
              maxWidth: '560px',
              fontWeight: 400,
              display: 'flex',
            }}
          >
            {t.tagline}
          </div>

          {/* Bottom bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 80px',
              background: 'rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {/* Logo icon */}
              <svg width="28" height="28" viewBox="0 0 100 100">
                <path
                  d="M65.2,36.8c-5.6,1.6-10.2,2.1-14.2,1.8c2.4,21.3-8.6,49.4-8.6,49.4S88.4,29.9,65.2,36.8z M30.2,15.2 c0,0,1.3,21.6,20.7,23.3C49.6,26.6,44.1,16.9,30.2,15.2z M64.4,32.2c4.1,0,7.3-4.5,7.3-10.1c0-5.6-3.3-10.1-7.3-10.1 c-4.1,0-7.3,4.5-7.3,10.1C57,27.7,60.3,32.2,64.4,32.2z"
                  fill="white"
                />
                <path
                  d="M5.2,45.4c0,0,9,13.1,21.8,6.8C21.7,45.2,14.5,41.1,5.2,45.4z M35.3,45.6c-2.9,3.1-5.6,5.2-8.2,6.5 c9.6,12.5,13.4,34.2,13.4,34.2S47.2,32.5,35.3,45.6z M33,43.1c2.5-1.5,2.9-5.6,0.8-9.1c-2.1-3.5-5.9-5.1-8.4-3.6 c-2.5,1.5-2.9,5.6-0.8,9.1C26.7,43,30.5,44.6,33,43.1z"
                  fill="white"
                />
                <path
                  d="M0,74.5c0,0,10.8,4.2,16-4.9C9.9,67.6,3.9,68,0,74.5z M18.3,62.3c-0.4,3.1-1.3,5.5-2.3,7.3 c10.9,3.6,22.2,15.3,22.2,15.3S20.2,49.4,18.3,62.3z M9.3,62.9c2.7,1.3,5.7,0.7,6.6-1.3c0.9-2-0.6-4.6-3.3-5.9 C9.9,54.5,7,55.1,6,57.1C5.1,59,6.6,61.7,9.3,62.9z"
                  fill="white"
                />
              </svg>
              <div
                style={{
                  fontSize: '16px',
                  color: 'rgba(255,255,255,0.7)',
                  marginLeft: '12px',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  display: 'flex',
                }}
              >
                waytofutureua.org.ua
              </div>
            </div>

            {/* Action hints */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 16px',
                  background: 'rgba(245,184,0,0.2)',
                  border: '1px solid rgba(245,184,0,0.4)',
                  borderRadius: '6px',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    color: '#FFD500',
                    fontWeight: 600,
                    letterSpacing: '1px',
                    display: 'flex',
                  }}
                >
                  {t.donate}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 16px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: '6px',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.8)',
                    fontWeight: 600,
                    letterSpacing: '1px',
                    display: 'flex',
                  }}
                >
                  {t.track}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
