const fs = require('fs');

const appFile = 'E:/Resider/resider-portal/src/App.tsx';
let content = fs.readFileSync(appFile, 'utf-8');

// Add imports
const importsToAdd = `
import AppHeader from './components/AppHeader';
import HomeTab from './components/tabs/HomeTab';
import CategoriesTab from './components/tabs/CategoriesTab';
import CommunityTab from './components/tabs/CommunityTab';
import SupportTab from './components/tabs/SupportTab';
import ReviewModal from './components/ReviewModal';
import GameIFrame from './components/GameIFrame';
`;
content = content.replace(/import AlinMap from '\.\/components\/AlinMap';/, "import AlinMap from './components/AlinMap';\n" + importsToAdd);

// Remove extracted constants/refs from App.tsx
// heroScrollRef, heroDragState, scrollHero, handleHeroPointerDown, handleHeroPointerMove, handleHeroPointerUpOrLeave
content = content.replace(/  const heroScrollRef = useRef<HTMLDivElement>\(null\);\n  const heroDragState = useRef[\s\S]*?const handleHeroPointerUpOrLeave = \(\) => {\n    heroDragState\.current\.isDown = false;\n  };\n/, '');

// Replace <header>...</header>
const headerRegex = /<header className="bg-\[#1a1d24\]\/80 backdrop-blur-md border-b border-gray-800\/60 sticky top-0 z-50">[\s\S]*?<\/header>/;
content = content.replace(headerRegex, `      <AppHeader
        user={user}
        userStats={userStats}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isFilterExpanded={isFilterExpanded}
        setIsFilterExpanded={setIsFilterExpanded}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        isSearchActive={isSearchActive}
        AVAILABLE_CATEGORIES={AVAILABLE_CATEGORIES}
        isUserInfoOpen={isUserInfoOpen}
        setIsUserInfoOpen={setIsUserInfoOpen}
        setIsAuthOpen={setIsAuthOpen}
        logout={logout}
        handleUpdateAvatar={handleUpdateAvatar}
        setIsMyGamesOverlayOpen={setIsMyGamesOverlayOpen}
      />`);

// Replace HomeTab
const homeRegex = /{activeTab === 'home' && \([\s\S]*?{\/\* Categories Sections \*\/}[\s\S]*?}\)\s*<\/div>\s*\)\}/;
content = content.replace(homeRegex, `{activeTab === 'home' && (
          <HomeTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            isSearchActive={isSearchActive}
            filteredGames={filteredGames}
            fetchedGames={fetchedGames}
            recentlyPlayed={recentlyPlayed}
            handlePlayGame={handlePlayGame}
            AVAILABLE_CATEGORIES={AVAILABLE_CATEGORIES}
          />
        )}`);

// Replace CategoriesTab
const catRegex = /{activeTab === 'categories' && \([\s\S]*?Explore Categories[\s\S]*?<Grid[\s\S]*?<\/div>\s*<\/div>\s*\)\}/;
content = content.replace(catRegex, `{activeTab === 'categories' && (
          <CategoriesTab
            fetchedGames={fetchedGames}
            setActiveTab={setActiveTab}
          />
        )}`);

// Replace CommunityTab
const comRegex = /{activeTab === 'community' && \([\s\S]*?Community Hub[\s\S]*?Online Now[\s\S]*?<\/div>\s*<\/div>\s*\)\}/;
content = content.replace(comRegex, `{activeTab === 'community' && (
          <CommunityTab
            fetchedFriends={fetchedFriends}
            fetchExternalData={fetchExternalData}
          />
        )}`);

// Replace SupportTab
const supRegex = /{activeTab === 'support' && \([\s\S]*?Help & Support[\s\S]*?Send us a message[\s\S]*?<\/div>\s*\)\}/;
content = content.replace(supRegex, `{activeTab === 'support' && (
          <SupportTab />
        )}`);

// Replace Game IFrame
const iframeRegex = /{\/\* Loading Overlay \*\/}[\s\S]*?{\/\* Fullscreen Game Iframe Overlay \*\/}[\s\S]*?<\/iframe>\s*<\/div>\s*\)\}/;
content = content.replace(iframeRegex, `      <GameIFrame
        playingGame={playingGame}
        setPlayingGame={setPlayingGame}
        isGameLoading={isGameLoading}
        setGameStartTime={setGameStartTime}
        showNotification={showNotification}
      />`);

// Replace Review Modal
const reviewRegex = /{\/\* Review Modal \*\/}[\s\S]*?<AnimatePresence>[\s\S]*?{showReviewModal && \([\s\S]*?Submit Rating[\s\S]*?<\/AnimatePresence>/;
content = content.replace(reviewRegex, `      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        reviewGameId={reviewGameId}
        gameStartTime={gameStartTime}
        showNotification={showNotification}
      />`);

fs.writeFileSync(appFile, content, 'utf-8');
console.log('App.tsx successfully refactored!');
