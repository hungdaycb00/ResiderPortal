import { getBaseUrl } from '../../services/externalApi';

export interface AlinSearchResults {
  posts: any[];
  users: any[];
  games: any[];
  tags: Array<{ tag: string; count?: number }>;
}

export const EMPTY_SEARCH_RESULTS: AlinSearchResults = {
  posts: [],
  users: [],
  games: [],
  tags: [],
};

export const fetchAlinSearch = async (
  query: string,
  signal?: AbortSignal,
): Promise<AlinSearchResults> => {
  try {
    const API_BASE = getBaseUrl();
    const resp = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query.trim())}`, { signal });
    
    if (!resp.ok) {
      console.warn(`[Search] Server returned ${resp.status} for query: "${query}"`);
      return EMPTY_SEARCH_RESULTS;
    }

    const data = await resp.json();
    if (!data.success) return EMPTY_SEARCH_RESULTS;

    return {
      posts: Array.isArray(data.posts) ? data.posts : [],
      users: Array.isArray(data.users) ? data.users : [],
      games: Array.isArray(data.games) ? data.games : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err; // Cho phép abort signal lan truyền
    console.warn('[Search] Fetch error:', err?.message);
    return EMPTY_SEARCH_RESULTS;
  }
};

export const normalizeSearchUser = (rawUser: any) => ({
  ...rawUser,
  id: rawUser?.id,
  username: rawUser?.username || rawUser?.displayName || rawUser?.name || 'Mysterious User',
  avatar_url: rawUser?.avatar_url || rawUser?.avatar || '',
  status: rawUser?.status || rawUser?.profile_status || '',
});

export const normalizeSearchPostAuthor = (post: any) => {
  const author = post?.author || {};
  return normalizeSearchUser({
    id: author.id || post?.owner_id || post?.ownerId || post?.user_id,
    username: author.username || author.name || author.displayName,
    displayName: author.name || author.displayName || author.username,
    avatar: author.avatar || author.avatar_url,
    status: author.status,
  });
};

export const normalizeSearchGame = (game: any) => ({
  ...game,
  id: game?.id,
  title: game?.title || game?.name || 'Untitled Game',
  name: game?.name || game?.title || 'Untitled Game',
  fileName: game?.fileName || game?.html_file_path,
  image: game?.image || game?.thumbnail || game?.thumbnail_url,
  thumbnail: game?.thumbnail || game?.image || game?.thumbnail_url,
  ownerId: game?.ownerId || game?.creatorId || game?.owner_id,
});
