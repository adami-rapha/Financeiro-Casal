const fs = require('fs');
const pts = [['M', 50, 25], ['C', 50, 25, 45, 10, 25, 10], ['C', 5, 10, 5, 35, 5, 35], ['C', 5, 60, 50, 90, 50, 90], ['C', 50, 90, 95, 60, 95, 35], ['C', 95, 35, 95, 10, 75, 10], ['C', 55, 10, 50, 25, 50, 25]];
function getP(S) {
    let s = '';
    for (let p of pts) {
        if (p[0] === 'Z') { s += 'Z'; continue; }
        s += p[0] + ' ';
        for (let i = 1; i < p.length; i += 2) {
            s += (50 + (p[i] - 50) * S).toFixed(1) + ' ' + (45 + (p[i + 1] - 45) * S).toFixed(1) + ' ';
        }
    }
    return s.trim() + ' Z';
}
let out = 'Outer: ' + getP(1) + '\n';
out += 'Middle: ' + getP(0.72) + '\n';
out += 'Inner: ' + getP(0.44) + '\n';
fs.writeFileSync('paths_out.txt', out);
console.log('Done');
