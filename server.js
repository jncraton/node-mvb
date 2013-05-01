var fs = require('fs');

var express = require('express');
var md = require("node-markdown").Markdown;

var app = express();

var root = 'pages/';
var template = fs.readFileSync('template.html', 'utf-8');

var pages = {};

fs.readdirSync(root).forEach(function (parent) {
    pages[parent] = {};

    fs.readdirSync(root + parent).forEach(function (child) {
        var parts = child.match(/(\d+)\-(.*)/);

        if (parts) {
            var id = parts[1];

            pages[parent][id] = {
                id: id,
                slug: parts[2]
            };
        }
    });
});

function getPageDir(parent, id) {
    return root + parent + '/' + id + '-' + pages[parent][id].slug;
}

function genPage(pageDir) {
    var content = md(fs.readFileSync(pageDir + '/content.md', 'utf-8'));

    var page = template.replace('{{ content }}', content);

    var children = '';

    fs.readdirSync(pageDir).forEach(function(child) {
        if (child.match(/(\d+)\-(.*)/)) {
            var id = child.match(/(\d+)\-(.*)/)[1];
            var slug = child.match(/(\d+)\-(.*)/)[2];

            children += '<a href="/blog/' + id + '/' + slug + '">' + slug + '</a>'
        }
    });

    page = page.replace('{{ children }}', children);

    return page;
}

app.get('/', function(req, res){
    res.send(genPage(root + 'index'));
});

app.get('/:slug', function(req, res){
    res.send(genPage(root + req.params.slug));
});

app.get('/:parent/:id', function(req, res){
    res.send(genPage(getPageDir(req.params.parent, req.params.id)));
});

app.get('/:parent/:id/:slug', function(req, res){
    res.send(genPage(getPageDir(req.params.parent, req.params.id)));
});

app.listen(3000);
console.log('Server running at http://127.0.0.1:3000/');