import { useEffect } from 'react'

const SITE_NAME = 'Spaghetti Print'
const SITE_NAME_FA = 'اسپاگتی پرینت'
const DEFAULT_IMAGE = '/icon-512.png'
const JSONLD_ID = 'json-ld-structured-data'

/**
 * Resolve absolute URL for OG/JSON-LD (works with any domain on Pi5).
 */
export function absoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return typeof window !== 'undefined' ? window.location.origin : ''
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${origin}${path}`
}

function setMeta(attr, key, content) {
  if (!content) return
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(url) {
  if (!url) return
  let el = document.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', url)
}

function clearCanonical() {
  const el = document.querySelector('link[rel="canonical"]')
  if (el) el.remove()
}

/**
 * Inject or replace a single JSON-LD script block in <head>.
 * Pass null/undefined/[] to remove.
 */
export function setJsonLd(data) {
  let el = document.getElementById(JSONLD_ID)
  if (!data || (Array.isArray(data) && data.length === 0)) {
    if (el) el.remove()
    return
  }
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = JSONLD_ID
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME_FA,
    alternateName: SITE_NAME,
    url: absoluteUrl('/'),
    logo: absoluteUrl(DEFAULT_IMAGE),
    description: 'چاپ سه‌بعدی FDM — محصولات آماده و سفارشی با قیمت شفاف',
  }
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME_FA,
    alternateName: SITE_NAME,
    url: absoluteUrl('/'),
    inLanguage: 'fa-IR',
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME_FA,
      logo: absoluteUrl(DEFAULT_IMAGE),
    },
  }
}

export function buildBreadcrumbJsonLd(items) {
  // items: [{ name, path }]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

/**
 * Product schema for rich results (price, availability, image).
 * currency: IRR = Iranian Rial; UI shows Toman but schema uses IRR numeric.
 */
export function buildProductJsonLd(product) {
  if (!product) return null
  const price = product.final_price ?? product.suggested_price
  const images = []
  if (product.image_url) images.push(absoluteUrl(product.image_url))
  for (const img of product.images || []) {
    if (img?.image_url) images.push(absoluteUrl(img.image_url))
  }
  const uniqueImages = [...new Set(images)]
  const slug = product.slug
  const url = slug ? absoluteUrl(`/catalog/${slug}`) : absoluteUrl(`/catalog/${product.id}`)
  const description =
    (product.notes && String(product.notes).trim()) ||
    (product.description && String(product.description).trim()) ||
    `محصول چاپ سه‌بعدی ${product.name} — اسپاگتی پرینت`

  const categoryName = typeof product.category === 'string' && product.category.trim()
    ? product.category.strip ? product.category.strip() : product.category.trim()
    : Array.isArray(product.categories) && product.categories.length > 0
    ? product.categories[0].name
    : undefined

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description,
    sku: product.product_id || String(product.id),
    url,
    image: uniqueImages.length ? uniqueImages : [absoluteUrl(DEFAULT_IMAGE)],
    brand: {
      '@type': 'Brand',
      name: SITE_NAME_FA,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      reviewCount: '1',
      bestRating: '5',
      worstRating: '1',
    },
  }

  if (categoryName) {
    data.category = categoryName
  }

  if (product.material_name) {
    data.material = product.material_name
  }

  if (price != null && Number(price) > 0) {
    data.offers = {
      '@type': 'Offer',
      url,
      priceCurrency: 'IRR',
      price: String(Math.round(Number(price))),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: SITE_NAME_FA,
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'IRR',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'IR',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 3,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 5,
            unitCode: 'DAY',
          },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'IR',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
    }
  }

  return data
}

/**
 * SEO hook – title, meta description, OG/Twitter, optional JSON-LD.
 *
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.description
 * @param {string} [opts.image]
 * @param {string} [opts.url]
 * @param {object|object[]|null} [opts.jsonLd] – schema.org graph
 */
export function useSEO({ title, description, image, url, jsonLd } = {}) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME

    const ogUrl = url || (typeof window !== 'undefined' ? window.location.href : '')
    const ogImage = absoluteUrl(image || DEFAULT_IMAGE)

    if (description) setMeta('name', 'description', description)

    // Canonical — point to the clean slug URL passed in (or current URL)
    setCanonical(ogUrl)

    setMeta('property', 'og:title', title || SITE_NAME)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:image', ogImage)
    setMeta('property', 'og:url', ogUrl)
    setMeta('property', 'og:site_name', SITE_NAME)
    setMeta('property', 'og:locale', 'fa_IR')

    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', title || SITE_NAME)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', ogImage)

    if (jsonLd !== undefined) {
      setJsonLd(jsonLd)
    }

    return () => {
      // Clear page-specific JSON-LD on unmount so SPA nav doesn't leak schemas
      if (jsonLd !== undefined) setJsonLd(null)
      clearCanonical()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- compare jsonLd by value
  }, [title, description, image, url, JSON.stringify(jsonLd ?? null)])
}
