import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import NewsFeed from './NewsFeed';

vi.mock('axios');

describe('NewsFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('uses the GNews API when a key is configured', async () => {
    vi.stubEnv('VITE_NEWS_API_KEY', 'demo-key');

    axios.get.mockResolvedValue({
      data: {
        articles: [
          {
            title: 'Latest crypto headline',
            url: 'https://example.com/news',
            description: 'Fresh market update',
            publishedAt: '2024-01-01T00:00:00Z',
            image: 'https://example.com/image.jpg',
            source: { name: 'CoinDesk' },
          },
        ],
      },
    });

    render(<NewsFeed limit={3} />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        'https://gnews.io/api/v4/search',
        expect.objectContaining({
          params: expect.objectContaining({ apikey: 'demo-key' }),
        })
      );
    });

    expect(await screen.findByText(/Latest crypto headline/i)).toBeTruthy();
  });
});
