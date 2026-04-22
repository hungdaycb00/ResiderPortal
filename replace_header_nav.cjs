const fs = require('fs');
const file = 'e:/Resider/resider-portal/src/components/AlinMap.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    /onClick=\{\(\) => \{ setSelectedUser\(\{ \.\.\.myObfPos, isSelf: true, username: myDisplayName, province: currentProvince \}\); setIsSheetExpanded\(true\); \}\}/g,
    "onClick={() => { setSelectedUser(null); setMainTab('profile'); setActiveTab('info'); setIsSheetExpanded(true); }}"
);

code = code.replace(
    /onClick=\{\(\) => \{ setSelectedUser\(\{ id: myUserId, isSelf: true, username: myDisplayName, status: myStatus \}\); setIsSheetExpanded\(true\); \}\}/g,
    "onClick={() => { setSelectedUser(null); setMainTab('profile'); setActiveTab('info'); setIsSheetExpanded(true); }}"
);

fs.writeFileSync(file, code);
console.log("Replaced");
