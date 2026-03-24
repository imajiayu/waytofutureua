// P1 优化: 转换为服务端组件，减少客户端 JS
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { MapPinIcon } from '@/components/icons'

export default async function Footer() {
  const t = await getTranslations('footer')

  const socialLinks = [
    {
      name: 'YouTube',
      href: 'https://www.youtube.com/@AlexWaytohealth',
      icon: (
        <svg
          className="w-7 h-7"
          fill="currentColor"
          viewBox="0 0 576 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z" />
        </svg>
      ),
    },
    {
      name: 'Instagram',
      href: 'https://www.instagram.com/way__to_health',
      icon: (
        <svg
          className="w-7 h-7"
          fill="currentColor"
          viewBox="0 0 448 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
        </svg>
      ),
    },
    {
      name: 'TikTok',
      href: '#',
      icon: (
        <svg
          className="w-7 h-7"
          fill="currentColor"
          viewBox="0 0 448 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z" />
        </svg>
      ),
    },
    {
      name: 'Telegram',
      href: '#',
      icon: (
        <svg
          className="w-7 h-7"
          fill="currentColor"
          viewBox="0 0 496 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm121.8 169.9l-40.7 191.8c-3 13.6-11.1 16.9-22.4 10.5l-62-45.7-29.9 28.8c-3.3 3.3-6.1 6.1-12.5 6.1l4.4-63.1 114.9-103.8c5-4.4-1.1-6.9-7.7-2.5l-142 89.4-61.2-19.1c-13.3-4.2-13.6-13.3 2.8-19.7l239.1-92.2c11.1-4 20.8 2.7 17.2 19.5z" />
        </svg>
      ),
    },
  ]

  const contactInfo = [
    {
      label: t('email'),
      value: t('contactInfo.emailValue'),
      icon: (
        <svg
          className="w-5 h-5 text-gray-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      href: 'mailto:contact@waytofutureua.org.ua',
    },
    {
      label: t('phone'),
      value: t('contactInfo.phoneValue'),
      icon: (
        <svg
          className="w-5 h-5 text-gray-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
      ),
      href: 'tel:+380963837878',
    },
    {
      label: t('address'),
      value: t('contactInfo.addressValue').split('\n').map((line, i, arr) => (
        <span key={i}>
          {line}
          {i < arr.length - 1 && <br />}
        </span>
      )),
      icon: <MapPinIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />,
    },
  ]

  return (
    <footer className="relative bg-white border-t border-gray-200 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {/* Desktop background image */}
        <Image
          src="/images/footer/footer.webp"
          alt=""
          fill
          sizes="100vw"
          className="hidden md:block object-cover object-right"
          quality={85}
          priority={false}
        />

        {/* Mobile background image */}
        <Image
          src="/images/footer/footer-mobile.webp"
          alt=""
          fill
          sizes="100vw"
          className="md:hidden object-cover object-right"
          quality={85}
          priority={false}
        />

        {/* Gradient overlay: white on left (text area), transparent on right (image area) */}
        <div className="absolute inset-0 bg-gradient-to-r from-white from-[35%] via-white/60 via-[55%] to-transparent to-[75%]"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 md:pb-16">
          {/* Left: Social Media Icons */}
          <div className="flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 font-display">
              {t('followUs')}
            </h3>

            {/* 2x2 Grid - Equal height and width */}
            <div className="grid grid-cols-2 gap-3 w-fit">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-20 h-20 bg-gray-50/90 backdrop-blur-sm rounded-lg text-gray-600 hover:bg-ukraine-blue-50 hover:text-ukraine-blue-500 transition-all duration-200 hover:scale-110 hover:shadow-lg border border-gray-100/50 hover:border-ukraine-blue-200"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Middle: Contact Information */}
          <div className="flex-shrink-0 max-w-xs">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 font-display">
              {t('contactUs')}
            </h3>
            <div className="space-y-4">
              {contactInfo.map((info, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">{info.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                      {info.label}
                    </p>
                    {info.href ? (
                      <a
                        href={info.href}
                        className="text-sm text-gray-900 hover:text-ukraine-blue-500 transition-colors break-words"
                      >
                        {info.value}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-900 break-words leading-relaxed">
                        {info.value}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Policies */}
          <div className="flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 font-display">
              {t('policies')}
            </h3>
            <div className="space-y-3">
              <Link
                href="/privacy-policy"
                className="block text-sm text-gray-700 hover:text-ukraine-blue-500 transition-colors hover:underline underline-offset-2"
              >
                {t('privacyPolicy')}
              </Link>
              <Link
                href="/public-agreement"
                className="block text-sm text-gray-700 hover:text-ukraine-blue-500 transition-colors hover:underline underline-offset-2"
              >
                {t('publicAgreement')}
              </Link>
            </div>
          </div>
        </div>

        {/* Copyright - Bottom on mobile, bottom-left on desktop */}
        <div className="text-sm text-gray-600 mt-8 md:mt-0 md:absolute md:bottom-12 md:left-4 lg:left-8">
          <p>{t('copyrightLine1', { year: new Date().getFullYear() })}</p>
          <p>{t('copyrightLine2')}</p>
        </div>
      </div>
    </footer>
  )
}
