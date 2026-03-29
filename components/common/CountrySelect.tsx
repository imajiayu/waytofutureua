'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useLocale } from 'next-intl'
import countries from 'i18n-iso-countries'

// Register only the 3 locales we support
import enLocale from 'i18n-iso-countries/langs/en.json'
import zhLocale from 'i18n-iso-countries/langs/zh.json'
import ukLocale from 'i18n-iso-countries/langs/uk.json'

countries.registerLocale(enLocale)
countries.registerLocale(zhLocale)
countries.registerLocale(ukLocale)

const I18N_LOCALE_MAP: Record<string, string> = { ua: 'uk' }

function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join('')
}

const PINNED_CODES = ['UA', 'PL', 'DE', 'CZ', 'CN', 'US', 'GB']

// Override verbose ISO official names with common short names
// Override verbose ISO 3166-1 official names → common short names
// Only entries where at least one locale needs shortening
const NAME_OVERRIDES: Record<string, Record<string, string>> = {
  CN: { en: 'China' },
  TW: { en: 'Taiwan', zh: '台湾', uk: 'Тайвань' },
  IR: { en: 'Iran' },
  SY: { en: 'Syria' },
  LA: { en: 'Laos' },
  RU: { en: 'Russia' },
  MD: { en: 'Moldova' },
  PS: { en: 'Palestine' },
  TZ: { en: 'Tanzania' },
  CD: { en: 'DR Congo', zh: '刚果（金）', uk: 'ДР Конго' },
  CG: { en: 'Congo', zh: '刚果（布）' },
  MK: { en: 'North Macedonia' },
  GM: { en: 'Gambia' },
  FM: { en: 'Micronesia', zh: '密克罗尼西亚' },
  VG: { en: 'British Virgin Islands' },
  VI: { en: 'U.S. Virgin Islands' },
}

interface CountryOption {
  code: string
  name: string
  flag: string
  pinned: boolean
}

interface CountrySelectProps {
  value: string
  onChange: (code: string) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
  className?: string
}

export default function CountrySelect({
  value,
  onChange,
  placeholder = '',
  disabled = false,
  error = false,
  className = '',
}: CountrySelectProps) {
  const locale = useLocale()
  const i18nLocale = I18N_LOCALE_MAP[locale] || locale

  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)

  // Position for the portal dropdown
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })

  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Build country list
  const allCountries = useMemo<CountryOption[]>(() => {
    const nameMap = countries.getNames(i18nLocale, { select: 'official' })
    const pinnedSet = new Set(PINNED_CODES)

    const pinned: CountryOption[] = []
    const rest: CountryOption[] = []

    for (const [code, name] of Object.entries(nameMap)) {
      const displayName = NAME_OVERRIDES[code]?.[i18nLocale] || (name as string)
      const option: CountryOption = {
        code,
        name: displayName,
        flag: flagEmoji(code),
        pinned: pinnedSet.has(code),
      }
      if (option.pinned) pinned.push(option)
      else rest.push(option)
    }

    pinned.sort((a, b) => PINNED_CODES.indexOf(a.code) - PINNED_CODES.indexOf(b.code))
    rest.sort((a, b) => a.name.localeCompare(b.name, i18nLocale))
    return [...pinned, ...rest]
  }, [i18nLocale])

  const filtered = useMemo(() => {
    if (!search.trim()) return allCountries
    const q = search.trim().toLowerCase()
    return allCountries.filter(
      c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    )
  }, [search, allCountries])

  const selected = useMemo(
    () => allCountries.find(c => c.code === value),
    [allCountries, value]
  )

  useEffect(() => { setHighlightIndex(0) }, [filtered.length])

  useEffect(() => {
    if (!isOpen || !listRef.current) return
    const item = listRef.current.children[highlightIndex] as HTMLElement
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlightIndex, isOpen])

  // Calculate dropdown position from trigger element
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    })
  }, [])

  // Close on outside click (check both trigger and portal dropdown)
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  // Reposition on scroll, close on resize
  useEffect(() => {
    if (!isOpen) return

    const handleScroll = (e: Event) => {
      // Ignore scrolling inside the dropdown list itself
      if (dropdownRef.current?.contains(e.target as Node)) return
      updatePosition()
    }

    const handleResize = () => setIsOpen(false)

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true })
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true })
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen, updatePosition])

  const open = useCallback(() => {
    if (disabled) return
    updatePosition()
    setIsOpen(true)
    setSearch('')
    setHighlightIndex(0)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [disabled, updatePosition])

  const select = useCallback((code: string) => {
    onChange(code)
    setIsOpen(false)
    setSearch('')
  }, [onChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        open()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIndex(i => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[highlightIndex]) select(filtered[highlightIndex].code)
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
    }
  }

  const pinnedCount = useMemo(() => {
    if (search.trim()) return 0
    return filtered.filter(c => c.pinned).length
  }, [filtered, search])

  // Portal dropdown rendered at document.body level
  const dropdown = isOpen && typeof window !== 'undefined' && createPortal(
    <div
      ref={dropdownRef}
      className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden mkt-fade-in"
      style={{
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 9999,
      }}
    >
      {/* Search input */}
      <div className="p-2.5 border-b border-gray-100">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300"
            fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg
                     placeholder:text-gray-300
                     focus:bg-white focus:ring-1 focus:ring-ukraine-blue-500/20 focus:border-ukraine-blue-400
                     outline-none transition-all"
          />
        </div>
      </div>

      {/* Country list */}
      <ul
        ref={listRef}
        role="listbox"
        className="max-h-56 overflow-y-auto overscroll-contain py-1"
      >
        {filtered.length === 0 ? (
          <li className="px-4 py-3 text-sm text-gray-400 text-center">—</li>
        ) : (
          filtered.map((country, i) => (
            <li key={country.code}>
              {pinnedCount > 0 && i === pinnedCount && (
                <div className="mx-3 my-1 border-t border-gray-100" />
              )}
              <button
                type="button"
                role="option"
                aria-selected={country.code === value}
                onClick={() => select(country.code)}
                onMouseEnter={() => setHighlightIndex(i)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors
                  ${i === highlightIndex ? 'bg-ukraine-blue-50 text-ukraine-blue-700' : 'text-gray-700'}
                  ${country.code === value ? 'font-medium' : ''}`}
              >
                <span className="text-base leading-none">{country.flag}</span>
                <span className="truncate">{country.name}</span>
                <span className="text-[11px] text-gray-300 ml-auto font-data">{country.code}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>,
    document.body
  )

  return (
    <div className={className}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => isOpen ? setIsOpen(false) : open()}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`w-full flex items-center gap-2.5 px-4 py-3 bg-gray-50/80 border rounded-xl text-[15px] text-left
                   transition-all duration-200
                   focus:bg-white focus:ring-2 focus:ring-ukraine-blue-500/20 focus:border-ukraine-blue-400
                   disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                   ${error ? 'border-warm-400 bg-warm-50/30' : 'border-gray-200'}
                   ${isOpen ? 'bg-white ring-2 ring-ukraine-blue-500/20 border-ukraine-blue-400' : ''}`}
      >
        {selected ? (
          <>
            <span className="text-lg leading-none">{selected.flag}</span>
            <span className="text-gray-900 truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-gray-300">{placeholder}</span>
        )}
        <svg
          className={`w-4 h-4 text-gray-400 ml-auto shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {dropdown}
    </div>
  )
}
