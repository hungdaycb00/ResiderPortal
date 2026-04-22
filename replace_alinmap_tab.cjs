const fs = require('fs');

const alinMapPath = 'E:/Resider/resider-portal/src/components/AlinMap.tsx';
let content = fs.readFileSync(alinMapPath, 'utf-8');

// 1. Insert handleTabClick
const returnTarget = '    return (\n        <div className="fixed inset-0 z-[100]';
const handleTabClickStr = `    const handleTabClick = (tabId: string) => {
        setSelectedUser(null);
        if (tabId === 'profile') {
            setActiveTab('info');
        }
        if (mainTab === tabId) {
            setIsSheetExpanded(!isSheetExpanded);
        } else {
            setMainTab(tabId);
            setIsSheetExpanded(true);
        }
    };

    return (
        <div className="fixed inset-0 z-[100]`;

if (!content.includes('const handleTabClick =')) {
    content = content.replace(returnTarget, handleTabClickStr);
}

// 2. Replace PC nav onClick handlers
content = content.replace(/onClick=\{\(\) => \{ setSelectedUser\(null\); setMainTab\('discover'\); setIsSheetExpanded\(true\); \}\}/g, "onClick={() => handleTabClick('discover')}");
content = content.replace(/onClick=\{\(\) => \{ setSelectedUser\(null\); setMainTab\('nearby'\); setIsSheetExpanded\(true\); \}\}/g, "onClick={() => handleTabClick('nearby')}");
content = content.replace(/onClick=\{\(\) => \{ setSelectedUser\(null\); setMainTab\('friends'\); setIsSheetExpanded\(true\); \}\}/g, "onClick={() => handleTabClick('friends')}");
content = content.replace(/onClick=\{\(\) => \{ setSelectedUser\(null\); setMainTab\('profile'\); setActiveTab\('info'\); setIsSheetExpanded\(true\); \}\}/g, "onClick={() => handleTabClick('profile')}");

// 3. Replace Mobile nav onClick handlers
content = content.replace(/onClick=\{\(\) => \{ setSelectedUser\(null\); setMainTab\('discover'\); setIsSheetExpanded\(false\); \}\}/g, "onClick={() => handleTabClick('discover')}");

fs.writeFileSync(alinMapPath, content, 'utf-8');
console.log('Tab toggle logic added successfully!');
