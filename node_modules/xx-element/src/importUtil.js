const fs = require('fs');
const path = require('path');

module.exports = fileName => ({
	template: fs.readFileSync(fileName.replace(/\.js$/, '.html'), 'utf8'),
	name: 'x-' + path.parse(fileName).name.match(/([A-Z]|^)[^A-Z]*/g).join('-').toLowerCase(),
});
