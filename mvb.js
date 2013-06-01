var fs = require('fs');

var express = require('express');
var md = require('node-markdown').Markdown;

var conf = require('./conf.json');

var app = express();

var root = 'pages/';
var template = fs.readFileSync('template.html', 'utf-8');
var style = fs.readFileSync('style.css', 'utf-8');

template = template.replace('{{ style }}', style)

var pages = {};

function getPageDir(parent, id) {
    if (id) {
        return root + parent + '/' + id + '-' + pages[parent][id].slug;
    } else {
        return root + parent;
    }
}

fs.readdirSync(root).forEach(function (parent) {
    if (parent == 'index.md') {
        pages['root'] = {
            slug: '',
            canonicalUrl: '/',
            content: fs.readFileSync(root + parent, 'utf-8')
        }
    } else {
        pages[parent] = {
            slug: parent,
            canonicalUrl: '/' + parent,
            content: fs.readFileSync(root + parent + '/index.md', 'utf-8')
        };

        fs.readdirSync(root + parent).forEach(function (child) {
            var parts = child.match(/(\d+)\-(.*)/);

            if (parts) {
                var id = parts[1];

                pages[parent][id] = {
                    id: id,
                    canonicalUrl: '/' + parent + '/' + id,
                    slug: parts[2]
                };

                pages[parent][id].content = fs.readFileSync(getPageDir(parent, id) + '/index.md', 'utf-8');

                pages[parent][id].title = pages[parent][id].content.match(/# (.*?)\n/)[1];
            }
        });
    }
});

function genPage(parent, id) {
    var page;

    if (parent) {
        if (id) {
            page = pages[parent][id]
        } else {
            page = pages[parent];
        }
    } else {
        page = pages['root'];
    }

    var html = template.replace('{{ content }}', md(page.content));
    
    html = html.replace('{{ title }}', page.title || conf.title);
    html = html.replace('{{ canonicalUrl }}', conf.baseUrl + page.canonicalUrl);

    if (!id) {
        var children = '';

        Object.keys(page).forEach(function (id) {
            if (!isNaN(id)) {
                var slug = page[id].slug;
                var title = page[id].title

                children += '<a href="/' + parent + '/' + id + '/' + slug + '">' + title + '</a><br />'
            }
        });

        html = html.replace('{{ children }}', children);
    } else {
        html = html.replace('{{ children }}', '');
    }

    return html;
}

app.get('/', function(req, res){
    res.send(genPage());
});

app.get('/:parent', function(req, res){
    res.send(genPage(req.params.parent));
});

app.get('/:parent/:id', function(req, res){
    res.redirect(301, '/' + req.params.parent + '/' + req.params.id + '/' + pages[req.params.parent][req.params.id].slug + '/');
});

app.get('/:parent/:id/:slug/', function(req, res){
    res.send(genPage(req.params.parent, req.params.id));
});

app.get('/:parent/:id/:slug/:file', function(req, res){
    res.sendfile(root + req.params.parent + '/' + req.params.id + '-' + pages[req.params.parent][req.params.id].slug + '/' + req.params.file);
});

app.get('/:parent/:id/:slug', function(req, res){
    res.redirect(301, '/' + req.params.parent + '/' + req.params.id + '/' + pages[req.params.parent][req.params.id].slug + '/');
});

app.listen(conf.port);
console.log('Server running at http://127.0.0.1:' + conf.port);