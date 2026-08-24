import { describe, it, expect, vi, beforeEach } from 'vitest';

const axiosState = vi.hoisted(() => ({
  clients: [],
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn((config) => {
      const client = {
        config,
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          response: { use: vi.fn() },
        },
      };
      axiosState.clients.push(client);
      return client;
    }),
  },
}));

async function loadApiModule() {
  vi.resetModules();
  axiosState.clients.length = 0;
  const mod = await import('../../lib/api');
  return {
    mod,
    authedApi: axiosState.clients[0],
    publicApi: axiosState.clients[1],
  };
}

describe('API public contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps public reads on a no-credentials client and forwards abort config', async () => {
    const { mod, authedApi, publicApi } = await loadApiModule();
    const config = { signal: new AbortController().signal };

    mod.getPublicBrand(config);
    mod.getCatalog(config);
    mod.getCatalogCategories(config);
    mod.getCatalogCollections(config);
    mod.getCatalogProduct(42, config);
    mod.getCatalogProductBySlug('sluggy', config);
    mod.getBlogPosts(config);
    mod.getBlogPostBySlug('news', config);
    mod.getContact(config);

    expect(publicApi.config.withCredentials).toBe(false);
    expect(authedApi.get).not.toHaveBeenCalled();
    expect(publicApi.get).toHaveBeenNthCalledWith(1, '/brand', config);
    expect(publicApi.get).toHaveBeenNthCalledWith(2, '/catalog', config);
    expect(publicApi.get).toHaveBeenNthCalledWith(3, '/catalog/categories', config);
    expect(publicApi.get).toHaveBeenNthCalledWith(4, '/catalog/collections', config);
    expect(publicApi.get).toHaveBeenNthCalledWith(5, '/catalog/42', config);
    expect(publicApi.get).toHaveBeenNthCalledWith(6, '/catalog/by-slug/sluggy', config);
    expect(publicApi.get).toHaveBeenNthCalledWith(7, '/blog', config);
    expect(publicApi.get).toHaveBeenNthCalledWith(8, '/blog/news', config);
    expect(publicApi.get).toHaveBeenNthCalledWith(9, '/contact', config);
  });

  it('submits custom orders through the public client without auth cookies', async () => {
    const { mod, authedApi, publicApi } = await loadApiModule();
    const payload = { contact: '@customer', description: 'Custom figurine' };
    const config = { signal: new AbortController().signal };

    mod.submitCustomOrder(payload, config);

    expect(publicApi.config.withCredentials).toBe(false);
    expect(authedApi.post).not.toHaveBeenCalled();
    expect(publicApi.post).toHaveBeenCalledWith('/custom-orders', payload, config);
  });
});
