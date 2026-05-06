import { normalizeSearchGame, normalizeSearchPostAuthor, normalizeSearchUser } from './search';

type SearchTab = 'info' | 'posts' | 'saved';

interface SearchActionContext {
  nearbyUsers?: any[];
  setSelectedUser: (user: any) => void;
  setActiveTab: (tab: SearchTab) => void;
  setIsSheetExpanded: (v: boolean) => void;
  closeResults?: () => void;
  setSearchTag?: (value: string) => void;
  handlePlayGame?: (game: any) => void;
}

const closeSearchResults = (ctx: SearchActionContext) => {
  ctx.setIsSheetExpanded(true);
  ctx.closeResults?.();
};

export const openSearchUserResult = (ctx: SearchActionContext, rawUser: any) => {
  const nearbyUser = ctx.nearbyUsers?.find((user) => user.id === rawUser.id);
  ctx.setSelectedUser(nearbyUser || normalizeSearchUser(rawUser));
  ctx.setActiveTab('posts');
  closeSearchResults(ctx);
};

export const openSearchPostResult = (ctx: SearchActionContext, post: any) => {
  const author = normalizeSearchPostAuthor(post);
  const nearbyUser = ctx.nearbyUsers?.find((user) => user.id === author.id);
  ctx.setSelectedUser(nearbyUser || author);
  ctx.setActiveTab('posts');
  closeSearchResults(ctx);
};

export const openSearchGameResult = (ctx: SearchActionContext, game: any) => {
  ctx.handlePlayGame?.(normalizeSearchGame(game));
  ctx.closeResults?.();
  ctx.setSearchTag?.('');
};

export const openSearchTagResult = (ctx: SearchActionContext, tag: string) => {
  ctx.setSearchTag?.(tag);
  ctx.setIsSheetExpanded(true);
};
