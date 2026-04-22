const fs = require('fs');

const alinMapPath = 'E:/Resider/resider-portal/src/components/AlinMap.tsx';
let content = fs.readFileSync(alinMapPath, 'utf-8');

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

    return (`;

if (!content.includes('const handleTabClick =')) {
    content = content.replace(/return \(/, handleTabClickStr);
}

fs.writeFileSync(alinMapPath, content, 'utf-8');
console.log('Tab toggle logic added successfully with robust regex!');
