const fs = require('fs');

const path = 'e:/Resider/resider-portal/src/components/AlinMap.tsx';
let source = fs.readFileSync(path, 'utf8');
let replaceBlock = fs.readFileSync('e:/Resider/resider-portal/block.txt', 'utf8');

const splitPoints = source.split('{selectedUser ? (');
if (splitPoints.length >= 2) {
    let before = splitPoints[0];
    let discoverIndex = source.indexOf("{mainTab === 'discover' && (");
    if(discoverIndex !== -1) {
        let actualAfterStart = source.lastIndexOf(') : (', discoverIndex);
        if(actualAfterStart !== -1) {
           let output = before + '{selectedUser ? (\n' + replaceBlock + '\n                        ' + source.substring(actualAfterStart);
           fs.writeFileSync(path, output);
           console.log("Success replacing with fallback method!");
        } else {
           console.log("Cannot find exact end!");
        }
    } else {
        console.log("Cannot find discover tab");
    }
} else {
    console.log("Multiple or zero selected user matches found!");
}
