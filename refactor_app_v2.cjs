const fs = require('fs');

const appFile = 'E:/Resider/resider-portal/src/App.tsx';
let content = fs.readFileSync(appFile, 'utf-8');

// Replace HomeTab
const t1 = content.indexOf("{activeTab === 'home' && (");
const t2 = content.indexOf("{activeTab === 'categories' && (");
if (t1 !== -1 && t2 !== -1) {
  content = content.substring(0, t1) + `{activeTab === 'home' && (
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
        )}\n\n        ` + content.substring(t2);
}

// Replace CategoriesTab
const c1 = content.indexOf("{activeTab === 'categories' && (");
const c2 = content.indexOf("{activeTab === 'community' && (");
if (c1 !== -1 && c2 !== -1) {
  content = content.substring(0, c1) + `{activeTab === 'categories' && (
          <CategoriesTab
            fetchedGames={fetchedGames}
            setActiveTab={setActiveTab}
          />
        )}\n\n        ` + content.substring(c2);
}

// Replace CommunityTab
const co1 = content.indexOf("{activeTab === 'community' && (");
const co2 = content.indexOf("{activeTab === 'support' && (");
if (co1 !== -1 && co2 !== -1) {
  content = content.substring(0, co1) + `{activeTab === 'community' && (
          <CommunityTab
            fetchedFriends={fetchedFriends}
            fetchExternalData={fetchExternalData}
          />
        )}\n\n        ` + content.substring(co2);
}

// Replace SupportTab
const s1 = content.indexOf("{activeTab === 'support' && (");
const s2 = content.indexOf("{activeTab === 'creator' && (");
if (s1 !== -1 && s2 !== -1) {
  content = content.substring(0, s1) + `{activeTab === 'support' && (
          <SupportTab />
        )}\n        ` + content.substring(s2);
}

fs.writeFileSync(appFile, content, 'utf-8');
console.log('App.tsx successfully refactored V2!');
