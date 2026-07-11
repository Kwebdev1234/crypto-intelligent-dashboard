import PropTypes from 'prop-types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import './NewsFeed.css';

const NewsFeed = ({ limit = 9 }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  
  const categories = useMemo(() => [
    { id: 'all', label: 'All' },
    { id: 'BTC', label: 'Bitcoin' },
    { id: 'ETH', label: 'Ethereum' },
    { id: 'Altcoins', label: 'Altcoins' },
    { id: 'Trading', label: 'Trading' },
    { id: 'Business', label: 'Business' }
  ], []);
  
  const fallbackNews = useMemo(() => [
    {
      id: 'fallback-bitcoin',
      title: 'Bitcoin steadies as traders watch key macro data and ETF flows.',
      url: 'https://www.coindesk.com/markets/2024/10/17/bitcoin-steadies-as-traders-watch-key-macro-data-and-etf-flows',
      body: 'Institutional demand and calmer volatility are keeping sentiment constructive for major digital assets.',
      source: 'CoinDesk',
      published_on: Math.floor(Date.now() / 1000) - 3600,
      imageurl: 'https://images.unsplash.com/photo-1621504450181-5d356f61d307?auto=format&fit=crop&w=800&q=80',
      categories: 'BTC|Business'
    },
    {
      id: 'fallback-ethereum',
      title: 'Ethereum developers push new scaling upgrades ahead of a busy network cycle.',
      url: 'https://www.theblock.co/post/ethereum-scaling-upgrades',
      body: 'Layer-2 momentum and validator activity continue to reinforce Ethereum’s ecosystem growth.',
      source: 'The Block',
      published_on: Math.floor(Date.now() / 1000) - 7200,
      imageurl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80',
      categories: 'ETH|Trading'
    },
    {
      id: 'fallback-altcoins',
      title: 'Altcoin traders rotate into AI, gaming, and real-world asset narratives.',
      url: 'https://www.coindesk.com/tech/altcoins',
      body: 'Selective rotation is creating fresh opportunities across smaller-cap tokens with improving utility.',
      source: 'Crypto News',
      published_on: Math.floor(Date.now() / 1000) - 14400,
      imageurl: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=800&q=80',
      categories: 'Altcoins|Business'
    }
  ], []);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);

    const cacheKey = 'crypto_news_cache';
    const cachedData = sessionStorage.getItem(cacheKey);
    const cachedTimestamp = sessionStorage.getItem(`${cacheKey}_timestamp`);

    if (cachedData && cachedTimestamp) {
      const isStillValid = (Date.now() - parseInt(cachedTimestamp, 10)) < 15 * 60 * 1000;
      if (isStillValid) {
        try {
          const parsedData = JSON.parse(cachedData);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            setNews(parsedData);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Failed to parse cached data:', e);
        }
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const apiKey = import.meta.env.VITE_GNEWS_API_KEY;
      const isUsingGNews = Boolean(apiKey);

      const response = await axios.get(
        isUsingGNews ? 'https://gnews.io/api/v4/search' : 'https://api.rss2json.com/v1/api.json',
        {
          timeout: 12000,
          signal: controller.signal,
          params: isUsingGNews
            ? {
                q: 'crypto OR bitcoin OR ethereum',
                lang: 'en',
                max: Math.min(limit, 10),
                sortBy: 'publishedAt',
                apikey: apiKey,
              }
            : {
                rss_url: 'https://news.google.com/rss/search?q=crypto&hl=en-US&gl=US&ceid=US:en',
              },
        }
      );

      clearTimeout(timeoutId);

      const items = isUsingGNews ? (response?.data?.articles || []) : (response?.data?.items || []);
      const normalizedNews = items
        .filter((item) => item?.title && (item?.url || item?.link))
        .slice(0, limit)
        .map((item, index) => {
          const url = item.url || item.link;
          const sourceName = item.source?.name || item.author || new URL(url).hostname.replace('www.', '');
          const description = item.description || item.content || '';

          return {
            id: item.guid || item.id || `${url}-${index}`,
            title: item.title.replace(/&amp;/g, '&').replace(/&#39;/g, "'"),
            url,
            body: description.replace(/<[^>]*>/g, '').slice(0, 160) || 'Fresh updates from the crypto market.',
            source: sourceName,
            published_on: Math.floor(new Date(item.publishedAt || item.pubDate).getTime() / 1000),
            imageurl: item.image || item.thumbnail || item.enclosure?.link || fallbackNews[0].imageurl,
            categories: item.categories?.length ? item.categories.join('|') : 'BTC|Business',
          };
        });

      const nextNews = normalizedNews.length > 0 ? normalizedNews : fallbackNews;
      setNews(nextNews);

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(nextNews));
        sessionStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      } catch (e) {
        console.warn('Failed to cache news data:', e);
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      setNews(fallbackNews);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [fallbackNews, limit]);
  
  useEffect(() => {
    fetchNews();
    
    // Refresh news every 15 minutes
    const interval = setInterval(fetchNews, 15 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, [fetchNews]);
  
  // Format relative time (e.g., "2 hours ago")
  const getRelativeTime = useCallback((timestamp) => {
    const now = new Date();
    const publishedDate = new Date(timestamp * 1000); // Convert from Unix timestamp
    const diffInSeconds = Math.floor((now - publishedDate) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) { // Less than 7 days
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      // Format as date for older articles
      return publishedDate.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  }, []);
  
  // Filter news by category
  const filteredNews = useMemo(() => {
    if (activeCategory === 'all') {
      return news.slice(0, limit);
    }

    return news
      .filter((article) => {
        const articleCategories = (article.categories || '').split('|');
        return articleCategories.includes(activeCategory);
      })
      .slice(0, limit);
  }, [news, activeCategory, limit]);
  
  return (
    <section className="news-feed-container">
      <div className="news-header">
        <h2>Crypto News</h2>
        <a 
          href="https://www.cryptocompare.com/news/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="view-all-news"
        >
          View All News
        </a>
      </div>
      
      <div className="news-categories">
        {categories.map(category => (
          <button
            key={category.id}
            className={`news-category-btn ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.id)}
            aria-pressed={activeCategory === category.id}
          >
            {category.label}
          </button>
        ))}
      </div>
      
      {loading ? (
        <div className="news-loading" role="status" aria-live="polite">
          <div className="news-loading-animation"></div>
          <p>Loading latest crypto news...</p>
        </div>
      ) : error ? (
        <div className="news-error" role="alert">
          <p>{error}</p>
          <button onClick={fetchNews} aria-label="Retry fetching news">Retry</button>
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="no-news-message">
          <p>No news articles found for this category.</p>
          <button onClick={() => setActiveCategory('all')} className="reset-category-btn">
            Show all news
          </button>
        </div>
      ) : (
        <div className="news-grid">
          {filteredNews.map((article) => (
            <article className="news-card" key={article.id}>
              <div className="news-card-image">
                <img 
                  src={article.imageurl} 
                  alt="" // Decorative image
                  loading="lazy" 
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300x160?text=No+Image+Available';
                    e.target.alt = 'No image available';
                  }}
                />
                {article.categories && (
                  <span className="news-category-tag">
                    {article.categories.split('|')[0]}
                  </span>
                )}
              </div>
              <div className="news-card-content">
                <h3 className="news-title">
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label={article.title}
                  >
                    {article.title}
                  </a>
                </h3>
                <p className="news-excerpt">{article.body.substring(0, 100)}...</p>
                <div className="news-meta">
                  <span className="news-source">{article.source}</span>
                  <time className="news-time" dateTime={new Date(article.published_on * 1000).toISOString()}>
                    {getRelativeTime(article.published_on)}
                  </time>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

NewsFeed.propTypes = {
  limit: PropTypes.number
};

export default NewsFeed;
