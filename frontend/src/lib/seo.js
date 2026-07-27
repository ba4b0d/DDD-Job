import { useEffect } from 'react'

/**
 * SEO hook – dynamically updates document.title, meta description,
 * and Open Graph / Twitter Card tags on mount.
 *
 * @param {Object} opts
 * @param {string} opts.title       – page title (suffix " | Spaghetti Print" is appended)
 * @param {string} opts.description – meta + og:description
 * @param {string} [opts.image]     – og:image absolute URL (defaults to /icon-512.png)
 * @param {string} [opts.url]       – og:url (defaults to window.location.href)
 */
export function useSEO({ title, description, image, url } = {}) {
  useEffect(() => {
    const siteName = 'Spaghetti Print'
    const defaultImage = '/icon-512.png'

    // --- document.title ---
    document.title = title ? `${title} | ${siteName}` : siteName

    // --- helpers ---
    const setMeta = (attr, key, content) => {
      if (!content) return
      let el = document.querySelector(`meta[${attr}="${key}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    const ogUrl = url || window.location.href
    const ogImage = image || defaultImage

    // --- description ---
    if (description) {
      setMeta('name', 'description', description)
    }

    // --- Open Graph ---
    setMeta('property', 'og:title', title || siteName)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:image', ogImage)
    setMeta('property', 'og:url', ogUrl)
    setMeta('property', 'og:site_name', siteName)

    // --- Twitter Card ---
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', title || siteName)
    setMeta('name', 'twitter:description', description)
  }, [title, description, image, url])
}
