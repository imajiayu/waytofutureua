'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { defaultCountries, parseCountry, usePhoneInput } from 'react-international-phone'

// Reuse the flag emoji helper (same approach as CountrySelect — zero-cost unicode flags)
function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join('')
}

const PINNED_ISO2 = ['ua', 'pl', 'de', 'cz', 'cn', 'us', 'gb']

interface CountryInfo {
  name: string
  iso2: string
  dialCode: string
  flag: string
  pinned: boolean
}

interface PhoneInputProps {
  value: string
  onChange: (phone: string) => void
  defaultCountry?: string // ISO2 code, e.g. 'ua'
  placeholder?: string
  disabled?: boolean
  error?: boolean
  className?: string
}

export default function PhoneInput({
  value,
  onChange,
  defaultCountry = 'ua',
  placeholder = '',
  disabled = false,
  error = false,
  className = '',
}: PhoneInputProps) {
  const { inputValue, handlePhoneValueChange, inputRef, country, setCountry } = usePhoneInput({
    defaultCountry,
    value,
    onChange: ({ phone }) => onChange(phone),
  })

  const [selectorOpen, setSelectorOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)

  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Build country list
  const allCountries = useMemo<CountryInfo[]>(() => {
    const pinnedSet = new Set(PINNED_ISO2)
    const pinned: CountryInfo[] = []
    const rest: CountryInfo[] = []

    for (const raw of defaultCountries) {
      const c = parseCountry(raw)
      const info: CountryInfo = {
        name: c.name,
        iso2: c.iso2,
        dialCode: c.dialCode,
        flag: flagEmoji(c.iso2),
        pinned: pinnedSet.has(c.iso2),
      }
      if (info.pinned) pinned.push(info)
      else rest.push(info)
    }

    pinned.sort((a, b) => PINNED_ISO2.indexOf(a.iso2) - PINNED_ISO2.indexOf(b.iso2))
    rest.sort((a, b) => a.name.localeCompare(b.name))
    return [...pinned, ...rest]
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return allCountries
    const q = search.trim().toLowerCase()
    return allCountries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.iso2.includes(q)
    )
  }, [search, allCountries])

  const currentCountry = useMemo(
    () => allCountries.find((c) => c.iso2 === country?.iso2),
    [allCountries, country]
  )

  useEffect(() => {
    setHighlightIndex(0)
  }, [filtered.length])

  // Position dropdown
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 280),
    })
  }, [])

  // Outside click
  useEffect(() => {
    if (!selectorOpen) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return
      setSelectorOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [selectorOpen])

  // Reposition on scroll
  useEffect(() => {
    if (!selectorOpen) return
    const handleScroll = (e: Event) => {
      if (dropdownRef.current?.contains(e.target as Node)) return
      updatePosition()
    }
    const handleResize = () => setSelectorOpen(false)
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true })
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true })
      window.removeEventListener('resize', handleResize)
    }
  }, [selectorOpen, updatePosition])

  const openSelector = useCallback(() => {
    if (disabled) return
    updatePosition()
    setSelectorOpen(true)
    setSearch('')
    setHighlightIndex(0)
    requestAnimationFrame(() => searchInputRef.current?.focus())
  }, [disabled, updatePosition])

  const selectCountry = useCallback(
    (iso2: string) => {
      setCountry(iso2)
      setSelectorOpen(false)
      setSearch('')
      requestAnimationFrame(() => inputRef.current?.focus())
    },
    [setCountry, inputRef]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[highlightIndex]) selectCountry(filtered[highlightIndex].iso2)
        break
      case 'Escape':
        e.preventDefault()
        setSelectorOpen(false)
        break
    }
  }

  const pinnedCount = useMemo(() => {
    if (search.trim()) return 0
    return filtered.filter((c) => c.pinned).length
  }, [filtered, search])

  // Portal dropdown
  const dropdown =
    selectorOpen &&
    typeof window !== 'undefined' &&
    createPortal(
      <div
        ref={dropdownRef}
        className="mkt-fade-in fixed overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
        style={{
          top: dropdownPos.top,
          left: dropdownPos.left,
          width: dropdownPos.width,
          zIndex: 9999,
        }}
      >
        <div className="border-b border-gray-100 p-2.5">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-gray-300 focus:border-ukraine-blue-400 focus:bg-white focus:ring-1 focus:ring-ukraine-blue-500/20"
            />
          </div>
        </div>

        <ul role="listbox" className="max-h-56 overflow-y-auto overscroll-contain py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-center text-sm text-gray-400">—</li>
          ) : (
            filtered.map((c, i) => (
              <li key={c.iso2}>
                {pinnedCount > 0 && i === pinnedCount && (
                  <div className="mx-3 my-1 border-t border-gray-100" />
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={c.iso2 === country?.iso2}
                  onClick={() => selectCountry(c.iso2)}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors ${i === highlightIndex ? 'bg-ukraine-blue-50 text-ukraine-blue-700' : 'text-gray-700'} ${c.iso2 === country?.iso2 ? 'font-medium' : ''}`}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto font-data text-[11px] text-gray-300">+{c.dialCode}</span>
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
      <div
        className={`flex overflow-hidden rounded-xl border transition-all duration-200 focus-within:border-ukraine-blue-400 focus-within:ring-2 focus-within:ring-ukraine-blue-500/20 ${disabled ? 'bg-gray-100' : 'bg-gray-50/80'} ${error ? 'border-warm-400' : 'border-gray-200'}`}
      >
        {/* Country code trigger */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (selectorOpen ? setSelectorOpen(false) : openSelector())}
          disabled={disabled}
          className="flex shrink-0 items-center gap-1.5 border-r border-gray-200 pl-3 pr-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
        >
          {currentCountry && <span className="text-base leading-none">{currentCountry.flag}</span>}
          <svg
            className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${selectorOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Phone number input */}
        <input
          ref={inputRef}
          type="tel"
          value={inputValue}
          onChange={handlePhoneValueChange}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent px-3 py-3 text-[15px] text-gray-900 outline-none placeholder:text-gray-300 disabled:text-gray-400"
        />
      </div>

      {dropdown}
    </div>
  )
}
