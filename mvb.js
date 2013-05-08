var fs = require('fs');

var express = require('express');
var md = require("node-markdown").Markdown;

var app = express();

var root = 'pages/';
var template = fs.readFileSync('template.html', 'utf-8');

var pages = {};

function getPageDir(parent, id) {
    if (id) {
        return root + parent + '/' + id + '-' + pages[parent][id].slug;
    } else {
        return root + parent;
    }
}

fs.readdirSync(root).forEach(function (parent) {
    pages[parent] = {
        slug: parent,
        content: fs.readFileSync(root + parent + '/content.md', 'utf-8')
    };

    fs.readdirSync(root + parent).forEach(function (child) {
        var parts = child.match(/(\d+)\-(.*)/);

        if (parts) {
            var id = parts[1];

            pages[parent][id] = {
                id: id,
                slug: parts[2]
            };

            pages[parent][id].content = fs.readFileSync(getPageDir(parent, id) + '/content.md', 'utf-8');

            pages[parent][id].title = pages[parent][id].content.match(/# (.*?)\n/)[1];
        }
    });
});

function genPage(parent, id) {
    var page;

    if (id) {
        page = pages[parent][id]
    } else {
        page = pages[parent];
    }

    var html = template.replace('{{ content }}', md(page.content));

    if (!id) {
        var children = '';

        Object.keys(page).forEach(function (id) {
            if (!isNaN(id)) {
                var slug = page[id].slug;
                var title = page[id].title

                children += '<a href="/' + parent + '/' + id + '/' + slug + '">' + title + '</a>'
            }
        });
    }

    html = html.replace('{{ children }}', children);

    return html;
}

app.get('/', function(req, res){
    res.send(genPage('index'));
});

app.get('/:parent', function(req, res){
    res.send(genPage(req.params.parent));
});

app.get('/:parent/:id', function(req, res){
    res.send(genPage(req.params.parent, req.params.id));
});

app.get('/:parent/:id/:slug', function(req, res){
    res.send(genPage(req.params.parent, req.params.id));
});

app.listen(3000);
console.log('Server running at http://127.0.0.1:3000/');