const fs = require('fs');

const path = 'e:/Resider/resider-portal/src/components/AlinMap.tsx';
let source = fs.readFileSync(path, 'utf8');

// The profileBlock is properly closed by `)}`
// Let's find the index of `export default AlinMap;`
const endIdx = source.indexOf('export default AlinMap;');

if(endIdx !== -1) {
    // we want to go backwards to find the `</div>` that closes `space-y-4` of profile Block
    // Wait, let's just find the end of profile block inside source
    const profileEndStr = "Create your first post above!' : 'This user hasn\\'t posted anything.'}</p>\\n                                                    </div>\\n                                                )}\\n                                            </div>\\n                                        )}\\n                                    </div>\\n                                )}";
    
    // I can also just fix it by replacing the bad sequence
    // Let's regex replace everything from `\\n</div>\\n                                )}\\n` ... up to `export default AlinMap`
    
    let badSection = `</div>\n                                )}\n                            </div>\n                        )}\n                    </div>\n                </motion.div>\n            </div>\n        </div>\n    );\n};\n\nexport default AlinMap;`;
    let withCrLf = `</div>\r\n                                )}\r\n                            </div>\r\n                        )}\r\n                    </div>\r\n                </motion.div>\r\n            </div>\r\n        </div>\r\n    );\r\n};\r\n\r\nexport default AlinMap;`;

    let goodSection = `                            </div>\n                        )}\n                    </div>\n                </motion.div>\n            </div>\n        </div>\n    );\n};\n\nexport default AlinMap;`;
    
    if (source.includes(badSection)) {
        source = source.replace(badSection, goodSection);
        console.log("Fixed LF");
    } else if (source.includes(withCrLf)) {
        source = source.replace(withCrLf, goodSection);
        console.log("Fixed CRLF");
    } else {
        console.log("Could not find bad section");
    }
    
    fs.writeFileSync(path, source);
}
