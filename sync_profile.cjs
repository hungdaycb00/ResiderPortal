const fs = require('fs');

const path = 'e:/Resider/resider-portal/src/components/AlinMap.tsx';
let source = fs.readFileSync(path, 'utf8');

const profileBlock = fs.readFileSync('e:/Resider/resider-portal/profileBlock.txt', 'utf8');
const otherUserBlock = fs.readFileSync('e:/Resider/resider-portal/block.txt', 'utf8');

let output = source;

const splitPoints = source.split('{selectedUser ? (');
if (splitPoints.length >= 2) {
    let before = splitPoints[0];
    let discoverIndex = source.indexOf("{mainTab === 'discover' && (");
    if (discoverIndex !== -1) {
        let afterStart = source.lastIndexOf(') : (', discoverIndex);
        if (afterStart !== -1) {
            let secondHalf = source.substring(afterStart);
            
            // Find end of friends tab
            let blockedUsersIndex = secondHalf.indexOf("{/* Blocked Users */}");
            let friendsEndIndex = -1;
            if(blockedUsersIndex !== -1) {
                friendsEndIndex = secondHalf.indexOf(")}", blockedUsersIndex);
                if(friendsEndIndex !== -1) {
                    let closingDiv = secondHalf.indexOf("</div>", friendsEndIndex);
                    if(closingDiv !== -1) {
                        friendsEndIndex = closingDiv; // this closes <div className="pt-2"> ? Actually friends block is just mainTab === friends. But wait, closingDiv is the </div> wrapping ALL tabs.
                        // Wait! The profile tab needs to be inside `<div className="pt-2">` which wraps all mainTabs!
                    }
                }
            }
            
            if(friendsEndIndex !== -1) {
                let startSub = secondHalf.substring(0, friendsEndIndex);
                let endSub = secondHalf.substring(friendsEndIndex);
                output = before + '{selectedUser ? (\n' + otherUserBlock + '\n                        ' + startSub + '\n' + profileBlock + '\n' + endSub;
                fs.writeFileSync(path, output);
                console.log("Success replacing with profileBlock inserted at the end of tabs!");
            } else {
                console.log("Cannot find end of friends block");
            }
        } else {
            console.log("Cannot find actual selectedUser start branch");
        }
    } else {
        console.log("Cannot find discover tab");
    }
} else {
    console.log("Multiple or zero matches");
}
