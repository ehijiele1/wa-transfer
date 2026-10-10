import { FacebookAdapter } from '../src/services/platformAdapters';
import { PostContent } from '../src/types/socialMedia';

jest.mock('../src/utils/circuitBreaker', () => ({
  facebookCircuitBreaker: { execute: (fn: () => unknown) => fn() },
  twitterCircuitBreaker: { execute: (fn: () => unknown) => fn() },
  linkedinCircuitBreaker: { execute: (fn: () => unknown) => fn() },
}));

const content: PostContent = {
  id: 'test', platform: 'facebook', type: 'image', title: 'Test',
  content: 'Property', mediaUrls: ['https://example.com/photo.jpg'],
  hashtags: [], mentions: [], status: 'draft',
};

 describe('Facebook publishing media integrity', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('uploads a Blob and attaches the returned photo ID', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(new Response(new Uint8Array([255, 216, 255]), {
        headers: { 'content-type': 'image/jpeg' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'photo-1' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'page_post' })));
    global.fetch = fetchMock;
    await new FacebookAdapter().publish(content);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const form = fetchMock.mock.calls[1][1].body as FormData;
    expect(form.get('source')).toBeInstanceOf(Blob);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).attached_media)
      .toEqual([{ media_fbid: 'photo-1' }]);
  });

  it('does not publish a text-only post when its image download fails', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response('Unavailable', { status: 404 }));
    global.fetch = fetchMock;
    await expect(new FacebookAdapter().publish(content)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('includes hashtags and mentions when validating the final text length', () => {
    const adapter = new FacebookAdapter();
    adapter.config = { ...adapter.config, maxTextLength: 10 };
    expect(adapter.validateContent({ ...content, content: '1234567890', hashtags: ['#home'] }).valid)
      .toBe(false);
  });
});
